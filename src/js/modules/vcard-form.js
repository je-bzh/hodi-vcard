/**
 * Formulaire vCard (mes-infos.html)
 *
 * Gère 3 états :
 *   1. Anonyme              → mode CREATE, email librement saisissable
 *   2. Authentifié sans vCard → soit "en attente d'OTP" (= finalisation post-OTP),
 *                                soit CREATE normal pré-rempli
 *   3. Authentifié avec vCard → mode EDIT, email readonly
 *
 * Flow de création (avec OTP de confirmation) :
 *   a) User remplit le form (anonyme), clique "Créer ma vCard"
 *   b) On vérifie via RPC email_has_vcard que l'email n'a pas déjà une vCard
 *   c) On sauve le payload dans localStorage
 *   d) On appelle supabase.auth.signInWithOtp({email}) → magic link envoyé
 *   e) User clique le lien → revient sur mes-infos.html, authentifié
 *   f) Le module détecte localStorage + session + pas de vCard → INSERT
 *   g) Redirection vers /ma-vcard.html?slug=xxx
 *
 * Activé uniquement sur la page qui a data-page="mes-infos".
 */

import { supabase } from '/js/utils/supabase.js';
import { buildVcardUrl, assetUrl } from '/js/utils/urls.js';
import { createDefaultHodiWallpaperFor } from './wallpapers.js';
import { initIntlPhone, readPhone, writePhone } from './intl-phone.js';

const BASE_URL = import.meta.env.BASE_URL || '/';

const PENDING_KEY = 'hodi-vcard-pending';

if ($('html').attr('data-page') !== 'mes-infos') {
	console.log('[vcard-form] Module non-actif sur cette page.');
} else {
	bootstrap();
}

/**
 * Mapping name="..." du form → schéma DB.
 */
const FIELD_MAP = {
	'url':              { col: 'slug' },
	'email':            { col: 'owner_email' },
	'first-name':       { col: 'first_name' },
	'name':             { col: 'last_name' },
	'organisme':        { col: 'company' },
	'fonction':         { col: 'role' },

	'portable':         { col: 'phone_mobile' },
	'portable_country': { col: 'phone_mobile_country' },
	'ligne':            { col: 'phone_landline' },
	'ligne_country':    { col: 'phone_landline_country' },
	'adresse':          { col: 'address' },
	'web':              { col: 'website_url' },
	'prise':            { col: 'booking_url' },

	'document_label':   { col: 'document_label' },
	'document_url':     { col: 'document_url' },

	'linkedin':         { social: 'linkedin' },
	'instagram':        { social: 'instagram' },
	'facebook':         { social: 'facebook' },
	'pinterest':        { social: 'pinterest' },
	'snapchat':         { social: 'snapchat' },
	'tiktok':           { social: 'tiktok' },
	'signal':           { social: 'signal' },
	'telegram':         { social: 'telegram' },

	'whatsapp_enabled': { social: 'whatsapp_enabled', checkbox: true },
};

let currentVcard = null;
let currentUser = null;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap() {
	// 0. Init intl-tel-input sur les champs téléphone (avant tout le reste pour
	//    qu'enterEditMode/CreateMode puissent écrire dedans avec writePhone)
	document.querySelectorAll('.js-intl-tel').forEach((input) => {
		initIntlPhone(input, { defaultCountry: 'fr' });
	});

	// 1. Récupère la session (peut être null)
	const { data: { session } } = await supabase.auth.getSession();
	currentUser = session?.user || null;

	// 2. Charge le payload pending depuis localStorage si présent
	let pending = null;
	try {
		const raw = localStorage.getItem(PENDING_KEY);
		if (raw) pending = JSON.parse(raw);
	} catch (e) {
		console.warn('[vcard-form] pending data illisible, ignoré', e);
		localStorage.removeItem(PENDING_KEY);
	}

	if (currentUser) {
		// 3a. Authentifié : lookup vCard existante
		const { data: vcard, error } = await supabase
			.from('vcards')
			.select('*')
			.eq('user_id', currentUser.id)
			.maybeSingle();

		if (error) {
			console.error('[vcard-form] SELECT error', error);
			showFeedback('error', `Erreur de chargement : ${error.message}`);
			bindActions();
			return;
		}

		if (vcard) {
			// MODE EDIT
			currentVcard = vcard;
			enterEditMode(vcard);
		} else if (pending) {
			// Authentifié + pending data → finalisation post-OTP
			await finalizeCreate(pending);
			return;
		} else {
			// Authentifié sans vCard : on lui propose de la créer (email déjà connu)
			enterCreateMode({ emailLocked: true, defaultEmail: currentUser.email });
		}
	} else {
		// 3b. Anonyme : mode CREATE
		if (pending) {
			// On a un payload en attente mais pas de session → on pré-remplit le form pour ne rien perdre
			enterCreateMode({ emailLocked: false, defaultEmail: pending.owner_email });
			populateFormFromPending(pending);
		} else {
			enterCreateMode({ emailLocked: false, defaultEmail: '' });
		}
	}

	bindActions();
}

function bindActions() {
	$('.js-save-vcard').off('click').on('click', onSave);
	$('.js-delete-vcard').off('click').on('click', onDelete);
	$('.js-check-slug').off('click').on('click', onCheckSlug);
	$('input[name="url"]').off('input').on('input', updateSlugPreview);
	$('input[name="url"]').off('blur').on('blur', onSlugBlur);
}

// ---------------------------------------------------------------------------
// Modes UI
// ---------------------------------------------------------------------------
function enterEditMode(vcard) {
	populateForm(vcard);
	applyImages(vcard);
	$('.js-save-vcard').text('Enregistrer mes informations');
	$('.js-delete-vcard').show();
	enableSecondaryTabs(true);
	$('.js-form-intro').hide(); // bandeau d'intro inutile en mode édition

	// Affiche l'URL publique de la vCard + bouton Aperçu sous l'email
	const publicUrl = buildVcardUrl(vcard.slug);
	$('.js-vcard-link').attr('href', publicUrl).text(publicUrl);
	$('.js-vcard-preview').attr('href', publicUrl);
	$('.js-vcard-link-row').prop('hidden', false);
}

function enterCreateMode({ emailLocked, defaultEmail }) {
	resetImages();
	$('.js-save-vcard').text('Créer ma vCard');
	$('.js-delete-vcard').hide();
	enableSecondaryTabs(false);

	// En mode CREATE, on ne pré-remplit NI le username NI l'email.
	// L'utilisateur saisit ses propres infos. Les placeholders guident.
	$('input[name="email"]').val('').prop('readonly', false);
	updateSlugPreview();

	// Bandeau de réassurance visible (RGPD + sécurité)
	$('.js-form-intro').show();

	// La vCard n'existe pas encore → rien à prévisualiser
	$('.js-vcard-link-row').prop('hidden', true);
}

function populateFormFromPending(pending) {
	for (const [name, def] of Object.entries(FIELD_MAP)) {
		const $field = $(`[name="${name}"]`);
		if (!$field.length) continue;
		let value;
		if (def.col) value = pending[def.col];
		else if (def.social) value = (pending.socials || {})[def.social];
		if (def.checkbox) $field.prop('checked', value === true);
		else if (value != null) $field.val(value);
	}
}

/**
 * Active/désactive visuellement les tabs "Fonds d'écran" et "Signature mail"
 * tant que la vCard n'existe pas (rien à configurer sans vCard).
 */
function enableSecondaryTabs(enabled) {
	const $tabs = $('.list-filters li').not('.is-active');
	$tabs.each(function () {
		const $li = $(this);
		const $a = $li.find('a');
		if (enabled) {
			$li.removeClass('is-disabled');
			$a.css({ 'pointer-events': 'auto', opacity: '' });
			if ($a.data('href-original')) {
				$a.attr('href', $a.data('href-original'));
			}
		} else {
			$li.addClass('is-disabled');
			$a.css({ 'pointer-events': 'none', opacity: 0.35 });
			// Mémorise et neutralise le href
			if (!$a.data('href-original')) {
				$a.data('href-original', $a.attr('href') || '#');
			}
			$a.attr('href', '#');
			$a.attr('title', 'Disponible après la création de votre vCard.');
		}
	});
}

// ---------------------------------------------------------------------------
// Pré-remplissage du formulaire à partir d'une row vcards
// ---------------------------------------------------------------------------
function populateForm(vcard) {
	for (const [name, def] of Object.entries(FIELD_MAP)) {
		const $field = $(`[name="${name}"]`);
		if (!$field.length) continue;

		// Les champs téléphone sont gérés via intl-tel-input (cf. plus bas)
		if (name === 'portable' || name === 'ligne' ||
			name === 'portable_country' || name === 'ligne_country') continue;

		let value;
		if (def.col) value = vcard[def.col];
		else if (def.social) value = (vcard.socials || {})[def.social];

		if (def.checkbox) $field.prop('checked', value === true);
		else $field.val(value ?? '');
	}

	// Téléphones : on utilise writePhone pour aligner le drapeau intl-tel-input
	const $portable = document.querySelector('[name="portable"]');
	if ($portable) writePhone($portable, vcard.phone_mobile_country, vcard.phone_mobile);
	const $ligne = document.querySelector('[name="ligne"]');
	if ($ligne) writePhone($ligne, vcard.phone_landline_country, vcard.phone_landline);

	// Slug verrouillé après création
	$('input[name="url"]').prop('readonly', true)
		.attr('title', "Le slug ne peut pas être modifié après création.");
	// Email aussi readonly en édition
	$('input[name="email"]').prop('readonly', true);
	// Bouton "Vérifier" inutile en édition
	$('.js-check-slug').hide();

	updateSlugPreview();
}

// ---------------------------------------------------------------------------
// Construction du payload pour Supabase
// ---------------------------------------------------------------------------
function collectFormData() {
	const payload = { socials: {} };

	for (const [name, def] of Object.entries(FIELD_MAP)) {
		// Téléphones gérés séparément via readPhone
		if (name === 'portable' || name === 'ligne' ||
			name === 'portable_country' || name === 'ligne_country') continue;

		const $field = $(`[name="${name}"]`);
		if (!$field.length) continue;

		let value;
		if (def.checkbox) {
			value = $field.is(':checked');
		} else {
			value = ($field.val() || '').trim();
		}

		if (def.col) {
			payload[def.col] = value === '' ? null : value;
		} else if (def.social) {
			if (def.checkbox) payload.socials[def.social] = value;
			else if (value) payload.socials[def.social] = value;
		}
	}

	// Téléphones via intl-tel-input
	const $portable = document.querySelector('[name="portable"]');
	if ($portable) {
		const { country, national } = readPhone($portable);
		payload.phone_mobile = national || null;
		payload.phone_mobile_country = country || null;
	}
	const $ligne = document.querySelector('[name="ligne"]');
	if ($ligne) {
		const { country, national } = readPhone($ligne);
		payload.phone_landline = national || null;
		payload.phone_landline_country = country || null;
	}

	return payload;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validate(payload) {
	const errors = [];

	if (!payload.first_name) errors.push('Le prénom est requis.');
	if (!payload.last_name) errors.push('Le nom est requis.');
	if (!payload.owner_email) errors.push("L'email est requis.");
	else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.owner_email)) {
		errors.push("L'email saisi n'est pas valide.");
	}
	if (!payload.phone_mobile) errors.push('Le numéro de portable est requis.');
	if (!payload.slug) {
		errors.push('Le username Hodi vCard est requis.');
	} else if (!/^[a-z0-9-]+$/.test(payload.slug)) {
		errors.push('Le username ne peut contenir que des lettres minuscules, chiffres et tirets.');
	} else if (payload.slug.length < 3 || payload.slug.length > 50) {
		errors.push('Le username doit faire entre 3 et 50 caractères.');
	}

	return errors;
}

// ---------------------------------------------------------------------------
// Save : UPDATE si vCard existe, sinon flux CREATE (avec OTP de confirmation)
// ---------------------------------------------------------------------------
async function onSave(e) {
	e.preventDefault();
	const $btn = $(this);
	if ($btn.prop('disabled')) return;

	hideFeedback();
	const payload = collectFormData();

	const errors = validate(payload);
	if (errors.length) {
		showFeedback('error', errors.join('<br>'));
		return;
	}

	if (currentVcard) {
		// MODE UPDATE
		await doUpdate($btn, payload);
	} else {
		// MODE CREATE → check email + OTP
		await initiateCreate($btn, payload);
	}
}

async function doUpdate($btn, payload) {
	$btn.prop('disabled', true).css('opacity', 0.6);
	const originalLabel = $btn.text();
	$btn.text('Enregistrement…');

	try {
		// L'email et le slug ne sont jamais modifiés en update
		payload.owner_email = currentVcard.owner_email;
		payload.slug = currentVcard.slug;
		payload.user_id = currentVcard.user_id;

		const { data, error } = await supabase
			.from('vcards')
			.update(payload)
			.eq('id', currentVcard.id)
			.select()
			.single();

		if (error) {
			showFeedback('error', `Erreur : ${error.message}`);
			return;
		}

		currentVcard = data;
		const url = buildVcardUrl(data.slug);
		showFeedback(
			'success',
			`✓ Modifications enregistrées.<br>Lien public : <a href="${url}">${url}</a>`
		);
	} catch (err) {
		console.error('[vcard-form] update exception', err);
		showFeedback('error', "Erreur réseau. Vérifiez votre connexion et réessayez.");
	} finally {
		$btn.prop('disabled', false).css('opacity', 1);
		$btn.text(originalLabel);
	}
}

async function initiateCreate($btn, payload) {
	$btn.prop('disabled', true).css('opacity', 0.6);
	const originalLabel = $btn.text();
	$btn.text('Vérification…');

	try {
		// 1. Vérifier si l'email a déjà une vCard
		const { data: alreadyExists, error: rpcError } = await supabase
			.rpc('email_has_vcard', { p_email: payload.owner_email });

		if (rpcError) {
			console.error('[vcard-form] RPC email_has_vcard error', rpcError);
			showFeedback('error', `Erreur : ${rpcError.message}`);
			return;
		}

		if (alreadyExists) {
			showFeedback(
				'error',
				`Une vCard existe déjà pour <strong>${payload.owner_email}</strong>. ` +
				`Pour la modifier, cliquez sur "> Modifier" en bas de cette vCard.`
			);
			return;
		}

		// 2. Vérifier dispo du slug aussi
		const { data: slugFree } = await supabase.rpc('slug_available', { p_slug: payload.slug });
		if (slugFree === false) {
			showFeedback('error', `Le username « ${payload.slug} » est déjà pris. Choisissez-en un autre.`);
			return;
		}

		// 3. Sauver le payload en localStorage avant d'envoyer l'OTP
		// On préserve les éventuelles images déjà croppées (data URLs base64)
		// stockées par image-crop.js dans la clé pending.
		const rgpdNow = new Date().toISOString();
		let existingPending = {};
		try {
			const raw = localStorage.getItem(PENDING_KEY);
			if (raw) existingPending = JSON.parse(raw);
		} catch {}
		const toSave = {
			...payload,
			rgpd_consented_at: rgpdNow,
			_pending_cover_data_url: existingPending._pending_cover_data_url,
			_pending_avatar_data_url: existingPending._pending_avatar_data_url,
		};
		localStorage.setItem(PENDING_KEY, JSON.stringify(toSave));

		// 4. Envoyer l'OTP (Supabase crée le user en bg)
		$btn.text('Envoi de l\'email…');
		const { error: otpError } = await supabase.auth.signInWithOtp({
			email: payload.owner_email,
			options: {
				emailRedirectTo: `${window.location.origin}${BASE_URL}mes-infos.html`,
			},
		});

		if (otpError) {
			console.error('[vcard-form] signInWithOtp error', otpError);
			localStorage.removeItem(PENDING_KEY);
			showFeedback('error', `Erreur lors de l'envoi : ${otpError.message}`);
			return;
		}

		// 5. UI de confirmation
		showFeedback(
			'success',
			`<h6 style="margin: 0 0 1rem; font-weight: 600;">✓ Email de confirmation envoyé !</h6>` +
			`Un lien vient d'être envoyé à <strong>${payload.owner_email}</strong>.<br>` +
			`Cliquez dessus pour <strong>finaliser la création</strong> de votre vCard.<br><br>` +
			`<span style="opacity: 0.7;">Vous pouvez fermer cette fenêtre — le lien est valable 1 heure.</span>`
		);
		$btn.text('Email envoyé ✓').prop('disabled', true).css('opacity', 0.6);
	} catch (err) {
		console.error('[vcard-form] initiateCreate exception', err);
		showFeedback('error', "Erreur réseau. Vérifiez votre connexion et réessayez.");
		$btn.prop('disabled', false).css('opacity', 1);
		$btn.text(originalLabel);
	}
}

/**
 * Finalise la création après que l'utilisateur a cliqué le lien OTP.
 * 1) INSERT vcard avec les données du form
 * 2) Si des images sont en attente (base64 stockés pendant la création),
 *    les upload vers Storage et UPDATE la vcard avec les URLs publiques
 * 3) Redirection vers la vCard publique
 */
async function finalizeCreate(pending) {
	$('.js-save-vcard').text('Finalisation…').prop('disabled', true).css('opacity', 0.6);
	hideFeedback();
	showFeedback('info', 'Finalisation de la création de votre vCard…');

	// Extraire les images en attente avant d'envoyer le payload (sinon Supabase rejette)
	const pendingCoverDataUrl = pending._pending_cover_data_url;
	const pendingAvatarDataUrl = pending._pending_avatar_data_url;
	delete pending._pending_cover_data_url;
	delete pending._pending_avatar_data_url;

	try {
		pending.owner_email = currentUser.email;
		pending.user_id = currentUser.id;

		const { data: created, error } = await supabase
			.from('vcards')
			.insert(pending)
			.select()
			.single();

		if (error) {
			console.error('[vcard-form] finalizeCreate insert error', error);
			if (error.code === '23505') {
				showFeedback('error', `Erreur : une vCard existe déjà pour cet email ou ce username.`);
			} else {
				showFeedback('error', `Erreur lors de la finalisation : ${error.message}`);
			}
			$('.js-save-vcard').text('Réessayer').prop('disabled', false).css('opacity', 1);
			return;
		}

		// Upload des images en attente si présentes
		const imageUpdates = {};
		if (pendingCoverDataUrl) {
			showFeedback('info', 'Upload de la cover…');
			try {
				const url = await uploadDataUrlToStorage(pendingCoverDataUrl, currentUser.id, 'cover');
				imageUpdates.cover_url = url;
			} catch (e) {
				console.error('[vcard-form] cover upload failed', e);
			}
		}
		if (pendingAvatarDataUrl) {
			showFeedback('info', 'Upload de la photo de profil…');
			try {
				const url = await uploadDataUrlToStorage(pendingAvatarDataUrl, currentUser.id, 'avatar');
				imageUpdates.avatar_url = url;
			} catch (e) {
				console.error('[vcard-form] avatar upload failed', e);
			}
		}

		if (Object.keys(imageUpdates).length) {
			await supabase
				.from('vcards')
				.update(imageUpdates)
				.eq('id', created.id);
		}

		// Crée le wallpaper Hodi par défaut (best-effort, ne bloque pas la redirection
		// si ça plante — un fallback dans wallpapers.js le créera à la 1re visite mes-fonds).
		showFeedback('info', 'Génération de votre fond d\'écran Hodi…');
		await createDefaultHodiWallpaperFor({
			vcardId: created.id,
			slug: created.slug,
			userId: currentUser.id,
		});

		// Clean et redirection
		localStorage.removeItem(PENDING_KEY);
		showFeedback('success', `✓ vCard créée ! Redirection vers votre carte publique…`);

		setTimeout(() => {
			// Pretty URL en prod, query string en dev
			window.location.replace(buildVcardUrl(created.slug));
		}, 1200);
	} catch (err) {
		console.error('[vcard-form] finalizeCreate exception', err);
		showFeedback('error', "Erreur réseau pendant la finalisation. Réessayez dans un instant.");
		$('.js-save-vcard').text('Réessayer').prop('disabled', false).css('opacity', 1);
	}
}

/**
 * Upload un data URL base64 vers le bucket vcard-images.
 * Retourne l'URL publique.
 */
async function uploadDataUrlToStorage(dataUrl, userId, filename) {
	const [meta, b64] = dataUrl.split(',');
	const mime = (meta.match(/data:(.*?);/) || [null, 'image/png'])[1];
	const binary = atob(b64);
	const arr = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
	const blob = new Blob([arr], { type: mime });
	const path = `${userId}/${filename}-${Date.now()}.png`;

	const { error } = await supabase.storage
		.from('vcard-images')
		.upload(path, blob, { upsert: false, contentType: mime });
	if (error) throw error;

	const { data: { publicUrl } } = supabase.storage
		.from('vcard-images')
		.getPublicUrl(path);
	return publicUrl;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
async function onDelete(e) {
	e.preventDefault();
	if (!currentVcard) {
		showFeedback('info', "Vous n'avez pas de vCard à supprimer.");
		return;
	}

	const ok = window.confirm(
		`Confirmer la suppression définitive de la vCard « ${currentVcard.slug} » ?\n\n` +
		`Cette action est irréversible et casse tous les liens / QR codes existants.`
	);
	if (!ok) return;

	const { error } = await supabase
		.from('vcards')
		.delete()
		.eq('id', currentVcard.id);

	if (error) {
		showFeedback('error', `Erreur de suppression : ${error.message}`);
		return;
	}

	currentVcard = null;
	clearForm();
	resetImages();
	$('input[name="url"]').prop('readonly', false);
	$('input[name="email"]').prop('readonly', false);
	$('.js-check-slug').show();
	$('.js-delete-vcard').hide();
	enableSecondaryTabs(false);
	showFeedback('success', 'vCard supprimée. Vous pouvez en créer une nouvelle ci-dessus.');
	$('.js-save-vcard').text('Créer ma vCard');
}

// ---------------------------------------------------------------------------
// Slug : preview live + check de disponibilité
// ---------------------------------------------------------------------------
function updateSlugPreview() {
	$('.js-slug-status').text('').removeClass('form__slug-status--ok form__slug-status--ko');
}

function onSlugBlur() {
	const $input = $('input[name="url"]');
	if ($input.prop('readonly')) return;
	const normalized = slugify($input.val());
	if (normalized !== $input.val()) $input.val(normalized);
}

async function onCheckSlug(e) {
	e.preventDefault();
	const $btn = $(this);
	const $status = $('.js-slug-status');
	const raw = $('input[name="url"]').val().trim();
	const slug = slugify(raw);

	if (slug !== raw) {
		$('input[name="url"]').val(slug);
	}

	if (!slug) {
		$status.text('Saisissez un username avant de vérifier.').removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		return;
	}
	if (slug.length < 3) {
		$status.text('Trop court : minimum 3 caractères.').removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		return;
	}

	$btn.prop('disabled', true);
	$status.text('Vérification…').removeClass('form__slug-status--ok form__slug-status--ko');

	try {
		const { data, error } = await supabase.rpc('slug_available', { p_slug: slug });
		if (error) throw error;

		if (data === true) {
			$status.text(`✓ « ${slug} » est disponible !`).removeClass('form__slug-status--ko').addClass('form__slug-status--ok');
		} else {
			$status.text(`✗ « ${slug} » est déjà pris.`).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		}
	} catch (err) {
		console.error('[slug check] error', err);
		$status.text(`Erreur : ${err.message}`).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
	} finally {
		$btn.prop('disabled', false);
	}
}

// ---------------------------------------------------------------------------
// Images cover & avatar
// ---------------------------------------------------------------------------
const COVER_DEFAULT = assetUrl('public/assets/images/temp/form-bg.png');

function applyImages(vcard) {
	const $cover = $('.js-cover-image');
	const $avatar = $('.js-avatar-image');
	const $avatarPlaceholder = $('.js-avatar-placeholder');

	$cover.attr('src', vcard.cover_url || COVER_DEFAULT);

	if (vcard.avatar_url) {
		$avatar.attr('src', vcard.avatar_url).show();
		$avatarPlaceholder.hide();
	} else {
		$avatar.attr('src', '').hide();
		$avatarPlaceholder.show();
	}
}

function resetImages() {
	$('.js-cover-image').attr('src', COVER_DEFAULT);
	$('.js-avatar-image').attr('src', '').hide();
	$('.js-avatar-placeholder').show();
}

// ---------------------------------------------------------------------------
// Helpers UI
// ---------------------------------------------------------------------------
function clearForm() {
	$('input[type="text"], input[type="email"], input[type="tel"], input[type="url"]')
		.not('[readonly]').val('');
	$('input[type="checkbox"]').prop('checked', false);
	$('select.js-country').val('+33');
	updateSlugPreview();
}

function showFeedback(type, htmlMessage) {
	const $f = $('.js-form-feedback');
	const colors = {
		success: { bg: 'rgba(34, 197, 94, 0.12)',  color: '#bbf7d0', border: 'rgba(34, 197, 94, 0.4)' },
		error:   { bg: 'rgba(239, 68, 68, 0.12)',  color: '#fecaca', border: 'rgba(239, 68, 68, 0.4)' },
		info:    { bg: 'rgba(96, 165, 250, 0.12)', color: '#bfdbfe', border: 'rgba(96, 165, 250, 0.4)' },
	};
	const c = colors[type] || colors.info;
	$f.html(htmlMessage)
		.css({
			padding: '1.4rem 1.8rem',
			background: c.bg,
			color: c.color,
			border: `1px solid ${c.border}`,
			'border-radius': '8px',
			'font-size': '1.4rem',
			'margin-top': '1.6rem',
		})
		.prop('hidden', false);
}

function hideFeedback() {
	$('.js-form-feedback').prop('hidden', true).empty();
}

function slugify(str) {
	return (str || '')
		.toLowerCase()
		.normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
}
