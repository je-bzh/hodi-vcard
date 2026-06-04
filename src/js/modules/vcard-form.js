/**
 * Formulaire vCard (my-info)
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
 *   d) On appelle api.auth.requestLink({email}) → magic link envoyé
 *   e) User clique le lien → revient sur my-info, authentifié
 *   f) Le module détecte localStorage + session + pas de vCard → INSERT
 *   g) Redirection vers /card?slug=xxx
 *
 * Activé uniquement sur la page qui a data-page="my-info".
 */

import { api, boot } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';
import { buildVcardUrl, assetUrl } from '/js/utils/urls.js';
import { createDefaultHodiWallpaperFor } from './wallpapers.js';
import { initIntlPhone, readPhone, writePhone } from './intl-phone.js';

const PENDING_KEY = 'hodi-vcard-pending';

if ($('html').attr('data-page') !== 'my-info') {
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
	// 0. Init intl-tel-input sur les champs téléphone (lib chargée à la demande,
	//    on attend qu'elle soit prête pour qu'enterEditMode/writePhone l'utilisent)
	// Pays par défaut : géoloc Cloudflare (boot.country) sinon France.
	const defaultCountry = (boot && boot.country) || 'fr';
	await Promise.all(
		[...document.querySelectorAll('.js-intl-tel')].map((input) =>
			initIntlPhone(input, {
				defaultCountry,
				// Exemple de placeholder adapté : ligne fixe pour "ligne", mobile sinon
				numberType: input.name === 'ligne' ? 'FIXED_LINE' : 'MOBILE',
			})
		)
	);

	// 1. Récupère la session (peut être null) — déjà fournie par le serveur si hydraté
	if (boot) {
		currentUser = boot.user;
	} else {
		try {
			currentUser = await api.auth.session();
		} catch (e) {
			currentUser = null;
		}
	}

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
		// 3a. Authentifié : vCard existante (hydratée par le serveur, sinon API)
		let vcard = null;
		try {
			vcard = boot ? boot.vcard : await api.vcard.mine();
		} catch (error) {
			console.error('[vcard-form] mine() error', error);
			showFeedback('error', t('common.error', { message: error.message }));
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
	$('.js-save-vcard').text(t('form.save_update'));
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
	$('.js-save-vcard').text(t('form.save_create'));
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
			$a.attr('title', t('form.tab_locked_title'));
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
		.attr('title', t('form.slug_locked_title'));
	// Email aussi readonly en édition
	$('input[name="email"]').prop('readonly', true);
	// Bouton "Vérifier" inutile en édition
	$('.js-check-slug').hide();

	updateSlugPreview();
}

// ---------------------------------------------------------------------------
// Construction du payload pour l'API
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

	// L'email saisi sert d'identité de connexion (owner_email, privé côté serveur)
	// ET d'email de contact affiché sur la carte (email_public). On le synchronise
	// ici pour que la vCard publique continue d'afficher un email.
	if (payload.owner_email) {
		payload.email_public = payload.owner_email;
	}

	return payload;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validate(payload) {
	const errors = [];

	if (!payload.first_name) errors.push(t('error.first_name_required'));
	if (!payload.last_name) errors.push(t('error.last_name_required'));
	if (!payload.owner_email) errors.push(t('error.email_required'));
	else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.owner_email)) {
		errors.push(t('error.email_invalid'));
	}
	if (!payload.phone_mobile) errors.push(t('error.mobile_required'));
	if (!payload.slug) {
		errors.push(t('error.username_required'));
	} else if (!/^[a-z0-9-]+$/.test(payload.slug)) {
		errors.push(t('error.username_invalid'));
	} else if (payload.slug.length < 3 || payload.slug.length > 50) {
		errors.push(t('error.username_length'));
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
	$btn.text(t('common.saving'));

	try {
		// L'email et le slug ne sont jamais modifiés en update (immuables côté serveur)
		const data = await api.vcard.update(currentVcard.id, payload);

		currentVcard = data;
		const url = buildVcardUrl(data.slug);
		showFeedback('success', t('feedback.saved', { url: escapeHtml(url) }));
	} catch (err) {
		console.error('[vcard-form] update exception', err);
		showFeedback('error', t('feedback.network_error'));
	} finally {
		$btn.prop('disabled', false).css('opacity', 1);
		$btn.text(originalLabel);
	}
}

async function initiateCreate($btn, payload) {
	$btn.prop('disabled', true).css('opacity', 0.6);
	const originalLabel = $btn.text();
	$btn.text(t('form.checking'));

	try {
		// 1. Vérifier si l'email a déjà une vCard
		const alreadyExists = await api.emailHasVcard(payload.owner_email);

		if (alreadyExists) {
			showFeedback('error', t('feedback.email_already_used', { email: escapeHtml(payload.owner_email) }));
			return;
		}

		// 2. Vérifier dispo du slug aussi
		const slugFree = await api.slugAvailable(payload.slug);
		if (slugFree === false) {
			showFeedback('error', t('feedback.slug_taken', { slug: escapeHtml(payload.slug) }));
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

		// 4. Envoyer le magic-link (le back-end crée le compte si besoin)
		$btn.text(t('form.sending_email'));
		try {
			await api.auth.requestLink({ email: payload.owner_email, redirect: 'my-info' });
		} catch (otpError) {
			console.error('[vcard-form] requestLink error', otpError);
			localStorage.removeItem(PENDING_KEY);
			showFeedback('error', t('common.error', { message: otpError.message }));
			return;
		}

		// 5. UI de confirmation
		showFeedback('success', t('feedback.create_email_sent', { email: escapeHtml(payload.owner_email) }));
		$btn.text(t('form.email_sent_btn')).prop('disabled', true).css('opacity', 0.6);
	} catch (err) {
		console.error('[vcard-form] initiateCreate exception', err);
		showFeedback('error', t('feedback.network_error'));
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
	$('.js-save-vcard').text(t('form.finalizing_btn')).prop('disabled', true).css('opacity', 0.6);
	hideFeedback();
	showFeedback('info', t('feedback.finalizing'));

	// Extraire les images en attente avant d'envoyer le payload (sinon l'API rejette)
	const pendingCoverDataUrl = pending._pending_cover_data_url;
	const pendingAvatarDataUrl = pending._pending_avatar_data_url;
	delete pending._pending_cover_data_url;
	delete pending._pending_avatar_data_url;

	try {
		// owner_email est forcé côté serveur = email de session ; on ne l'envoie pas.
		let created;
		try {
			created = await api.vcard.create(pending);
		} catch (error) {
			console.error('[vcard-form] finalizeCreate create error', error);
			if (error.status === 409) {
				showFeedback('error', t('feedback.create_conflict'));
			} else {
				showFeedback('error', t('common.error', { message: error.message }));
			}
			$('.js-save-vcard').text(t('common.retry')).prop('disabled', false).css('opacity', 1);
			return;
		}

		// Upload des images en attente si présentes
		const imageUpdates = {};
		if (pendingCoverDataUrl) {
			showFeedback('info', t('feedback.uploading_cover'));
			try {
				const { url } = await api.upload(pendingCoverDataUrl, 'cover');
				imageUpdates.cover_url = url;
			} catch (e) {
				console.error('[vcard-form] cover upload failed', e);
			}
		}
		if (pendingAvatarDataUrl) {
			showFeedback('info', t('feedback.uploading_avatar'));
			try {
				const { url } = await api.upload(pendingAvatarDataUrl, 'avatar');
				imageUpdates.avatar_url = url;
			} catch (e) {
				console.error('[vcard-form] avatar upload failed', e);
			}
		}

		if (Object.keys(imageUpdates).length) {
			await api.vcard.update(created.id, imageUpdates);
		}

		// Crée le wallpaper Hodi par défaut (best-effort, ne bloque pas la redirection
		// si ça plante — un fallback dans wallpapers.js le créera à la 1re visite mes-fonds).
		showFeedback('info', t('feedback.generating_wallpaper'));
		await createDefaultHodiWallpaperFor({ slug: created.slug });

		// Clean et redirection
		localStorage.removeItem(PENDING_KEY);
		showFeedback('success', t('feedback.created_redirecting'));

		setTimeout(() => {
			// Pretty URL en prod, query string en dev
			window.location.replace(buildVcardUrl(created.slug));
		}, 1200);
	} catch (err) {
		console.error('[vcard-form] finalizeCreate exception', err);
		showFeedback('error', t('feedback.network_error'));
		$('.js-save-vcard').text(t('common.retry')).prop('disabled', false).css('opacity', 1);
	}
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
async function onDelete(e) {
	e.preventDefault();
	if (!currentVcard) {
		showFeedback('info', t('feedback.no_vcard_to_delete'));
		return;
	}

	const ok = window.confirm(t('form.delete_confirm', { slug: currentVcard.slug }));
	if (!ok) return;

	try {
		await api.vcard.remove(currentVcard.id);
	} catch (error) {
		showFeedback('error', t('wallpapers.delete_error', { message: error.message }));
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
	showFeedback('success', t('feedback.deleted'));
	$('.js-save-vcard').text(t('form.save_create'));
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
		$status.text(t('slug.empty')).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		return;
	}
	if (slug.length < 3) {
		$status.text(t('slug.too_short')).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		return;
	}

	$btn.prop('disabled', true);
	$status.text(t('slug.checking')).removeClass('form__slug-status--ok form__slug-status--ko');

	try {
		const data = await api.slugAvailable(slug);

		if (data === true) {
			$status.text(t('slug.available', { slug })).removeClass('form__slug-status--ko').addClass('form__slug-status--ok');
		} else {
			$status.text(t('slug.taken', { slug })).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
		}
	} catch (err) {
		console.error('[slug check] error', err);
		$status.text(t('slug.error', { message: err.message })).removeClass('form__slug-status--ok').addClass('form__slug-status--ko');
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

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[c]));
}

function slugify(str) {
	return (str || '')
		.toLowerCase()
		.normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
}
