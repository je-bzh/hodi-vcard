/**
 * Affichage public de la vCard (ma-vcard.html)
 *
 * Au chargement :
 *   - Lit le slug depuis ?slug=xxx dans l'URL
 *   - SELECT la vCard depuis Supabase
 *   - Peuple tous les bindings (nom, contacts, socials, actions)
 *   - Branche le bouton "Sauvegarder la fiche contact" (download .vcf)
 *   - Met à jour data-vcard-email du popup modifier
 *
 * Si pas de slug : affiche un message d'aide.
 * Si vcard introuvable : affiche un 404 propre.
 *
 * Activé uniquement sur la page qui a data-page="ma-vcard".
 */

import { supabase } from '/js/utils/supabase.js';
import { buildVcardUrl, assetUrl } from '/js/utils/urls.js';
import QRCode from 'qrcode';

if ($('html').attr('data-page') === 'ma-vcard') {
	bootstrap();
}

async function bootstrap() {
	const slug = getSlugFromUrl();

	if (!slug) {
		renderEmptyState();
		return;
	}

	const { data: vcard, error } = await supabase
		.from('vcards')
		.select('*')
		.ilike('slug', slug) // case-insensitive
		.maybeSingle();

	if (error) {
		console.error('[vcard-public] SELECT error', error);
		renderError(`Erreur : ${error.message}`);
		return;
	}

	if (!vcard) {
		renderNotFound(slug);
		return;
	}

	render(vcard);
}

// ---------------------------------------------------------------------------
// Rendu principal
// ---------------------------------------------------------------------------
function render(vcard) {
	// Titre de l'onglet
	document.title = `${joinName(vcard)} — Hodi vCard`;

	// Concaténation country code + numéro pour affichage
	const fullMobile = joinPhone(vcard.phone_mobile_country, vcard.phone_mobile);
	const fullLandline = joinPhone(vcard.phone_landline_country, vcard.phone_landline);

	// Pour l'email affiché sur la vcard publique : on utilise owner_email (l'email du compte)
	// → un seul email = celui rattaché au compte Hodi
	const displayEmail = vcard.owner_email || '';

	// Champs textuels
	setText('full_name', joinName(vcard));
	// role et company : on masque carrément l'élément si vide → pas de tirets, pas d'espace mort
	setTextOrHide('role', vcard.role);
	setTextOrHide('company', vcard.company);
	setText('phone_mobile', fullMobile);
	setText('phone_landline', fullLandline);
	setText('email_public', displayEmail);
	setText('address', vcard.address);
	setText('website_url', vcard.website_url);

	// Images
	setImg('cover_url', vcard.cover_url || assetUrl('public/assets/images/temp/bg-form.png'));

	// Avatar : si photo → on l'affiche. Sinon → rond bleu avec initiales prénom+nom.
	const $avatarImg = $('[data-bind="avatar_url"]');
	const $avatarInitials = $('.js-avatar-initials');
	if (vcard.avatar_url) {
		$avatarImg.attr('src', vcard.avatar_url).show();
		$avatarInitials.hide();
	} else {
		const initials = computeInitials(vcard);
		$avatarImg.hide();
		$avatarInitials.text(initials).show();
	}

	// QR code dynamique → pointe vers l'URL publique de cette vcard
	// Génération client-side : pas de Storage, pas de DB. Quand la vcard est
	// supprimée, la page renvoie un 404 et le QR n'est jamais re-généré.
	generateQrCode(buildVcardUrl(vcard.slug));

	// Sections contact (afficher uniquement les renseignées)
	toggleInfoRow('email_public', displayEmail, `mailto:${displayEmail}`);
	toggleInfoRow('phone_mobile', vcard.phone_mobile, `tel:${onlyDigits(fullMobile)}`);
	toggleInfoRow('phone_landline', vcard.phone_landline, `tel:${onlyDigits(fullLandline)}`);
	toggleInfoRow('address', vcard.address, mapsUrl(vcard.address));
	toggleInfoRow('website_url', vcard.website_url, vcard.website_url);

	// Document (plaquette, etc.) — n'affiche que si url ET label sont renseignés
	const $docRow = $('[data-bind-info="document"]');
	if (vcard.document_url && vcard.document_label) {
		$docRow.prop('hidden', false);
		$docRow.find('[data-bind="document_label"]')
			.text(vcard.document_label)
			.attr('href', vcard.document_url);
	} else {
		$docRow.prop('hidden', true);
	}

	// Boutons d'action
	toggleAction('website_url', vcard.website_url);
	toggleAction('booking_url', vcard.booking_url);

	// Socials (URLs)
	const socials = vcard.socials || {};
	toggleSocial('linkedin', socials.linkedin);
	toggleSocial('instagram', socials.instagram);
	toggleSocial('facebook', socials.facebook);
	toggleSocial('pinterest', socials.pinterest);

	// WhatsApp : géré séparément via checkbox + numéro mobile
	// Format wa.me : indicatif pays + numéro local SANS le 0 de tête, sans espaces.
	// Ex: +33 0651051611 → 33651051611 (pas 330651051611).
	if (socials.whatsapp_enabled === true && vcard.phone_mobile) {
		const waNumber = buildWaNumber(vcard.phone_mobile_country, vcard.phone_mobile);
		toggleSocial('whatsapp', `https://wa.me/${waNumber}`);
	} else {
		toggleSocial('whatsapp', null);
	}

	// Met à jour l'email cible du popup "Modifier" (pour le magic link)
	$('#popup-modifier').attr('data-vcard-email', vcard.owner_email);

	// Branche le téléchargement .vcf
	$('.js-vcf-download').off('click').on('click', (e) => {
		e.preventDefault();
		downloadVcf(vcard);
	});
}

// ---------------------------------------------------------------------------
// États d'erreur
// ---------------------------------------------------------------------------
function renderEmptyState() {
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">Pas de slug</h2>
			<p style="opacity: 0.7;">Cette page attend un paramètre <code>?slug=xxx</code> dans l'URL.</p>
			<p style="margin-top: 2.4rem;">
				<a href="/" style="color: #fff; text-decoration: underline;">← Retour à l'accueil</a>
			</p>
		</div>
	`);
	$('.section-info, .logo-container, #popup-modifier').hide();
}

function renderNotFound(slug) {
	document.title = `vCard introuvable — Hodi`;
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">404 — vCard introuvable</h2>
			<p style="opacity: 0.7;">Aucune vCard ne correspond au slug <strong>${escapeHtml(slug)}</strong>.</p>
			<p style="margin-top: 2.4rem;">
				<a href="/" style="color: #fff; text-decoration: underline;">← Retour à l'accueil</a>
			</p>
		</div>
	`);
	$('.section-info, .logo-container, #popup-modifier').hide();
}

function renderError(message) {
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">Une erreur est survenue</h2>
			<p style="opacity: 0.7;">${escapeHtml(message)}</p>
		</div>
	`);
}

// ---------------------------------------------------------------------------
// Helpers de binding
// ---------------------------------------------------------------------------
function setText(key, value) {
	$(`[data-bind="${key}"]`).text(value || '');
}

/**
 * Comme setText mais masque l'élément si la valeur est vide ou ne contient
 * que des séparateurs (tirets, virgules, espaces). Évite les "—" ou "-"
 * qui apparaîtraient pour un champ optionnel non renseigné.
 */
function setTextOrHide(key, value) {
	const $el = $(`[data-bind="${key}"]`);
	const clean = (value || '').trim();
	const meaningful = clean.replace(/[-–—,;\s]/g, '');
	if (!meaningful) {
		$el.text('').hide();
	} else {
		$el.text(clean).show();
	}
}

function setImg(key, value) {
	$(`[data-bind="${key}"]`).attr('src', value);
}

/**
 * Affiche/cache une ligne d'info contact, et set le lien si fourni.
 */
function toggleInfoRow(key, value, href) {
	const $row = $(`[data-bind-info="${key}"]`);
	if (!value) {
		$row.prop('hidden', true);
		return;
	}
	$row.prop('hidden', false);
	if (href) {
		$row.find('a').attr('href', href);
	}
}

/**
 * Affiche/cache un bouton d'action.
 */
function toggleAction(key, url) {
	const $li = $(`[data-bind-action="${key}"]`);
	if (!url) {
		$li.prop('hidden', true);
		return;
	}
	$li.prop('hidden', false);
	$li.find('a').attr('href', url);
}

/**
 * Affiche/cache une icône social.
 */
function toggleSocial(network, url) {
	const $li = $(`[data-bind-social="${network}"]`);
	if (!url) {
		$li.prop('hidden', true);
		return;
	}
	$li.prop('hidden', false);
	$li.find('a').attr('href', url);
}

// ---------------------------------------------------------------------------
// QR code
// ---------------------------------------------------------------------------
/**
 * Génère le QR code (PNG data URL) et l'injecte dans le slot .section__qr.
 * Bordure blanche déjà gérée par le CSS de .section__qr — on génère un QR
 * avec une marge blanche minimale (margin: 1 module).
 */
async function generateQrCode(url) {
	try {
		const dataUrl = await QRCode.toDataURL(url, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 360, // haute résolution pour rester net après scaling CSS
			color: { dark: '#000000', light: '#FFFFFF' },
		});
		$('[data-bind="qr_url"]').attr('src', dataUrl);
	} catch (err) {
		console.error('[vcard-public] QR generation failed', err);
	}
}

// ---------------------------------------------------------------------------
// Formatters & utilitaires
// ---------------------------------------------------------------------------
function joinName(vcard) {
	return [vcard.first_name, vcard.last_name].filter(Boolean).join(' ');
}

/**
 * Récupère le slug depuis l'URL en gérant les 2 formats :
 *   - Pretty URL : /vcard/jerome  → "jerome" (lu depuis le path)
 *   - Legacy    : /vcard/ma-vcard.html?slug=jerome → "jerome" (lu depuis query)
 *
 * Permet la rétro-compatibilité avec d'anciens liens partagés en `?slug=`.
 */
function getSlugFromUrl() {
	// Tente d'abord la pretty URL : segment final du pathname
	const path = window.location.pathname || '';
	const BASE = (import.meta.env.BASE_URL || '/');
	let afterBase = path;
	if (path.startsWith(BASE)) afterBase = path.slice(BASE.length);
	afterBase = afterBase.replace(/^\/+/, '').replace(/\/+$/, '');

	// Si ce qui reste après la base est un slug-like (pas .html, pas vide), on le prend
	if (afterBase && !afterBase.endsWith('.html') && !afterBase.includes('/')) {
		return afterBase;
	}

	// Sinon fallback sur le query string
	return new URLSearchParams(window.location.search).get('slug');
}

/**
 * Initiales prénom+nom (ex : "Jerome Le Grognec" → "JL"). Fallback "?".
 */
function computeInitials(vcard) {
	const first = ((vcard.first_name || '').trim().charAt(0) || '').toUpperCase();
	const last = ((vcard.last_name || '').trim().charAt(0) || '').toUpperCase();
	return (first + last) || '?';
}

function joinPhone(country, number) {
	if (!number) return '';
	return `${country || '+33'} ${number}`.trim();
}

function onlyDigits(s) {
	return (s || '').replace(/\D/g, '');
}

/**
 * Construit le numéro pour les liens wa.me (format international sans 0).
 *   buildWaNumber('+33', '0651051611')  → '33651051611'
 *   buildWaNumber('+262', '0692123456') → '262692123456'
 */
function buildWaNumber(country, local) {
	const countryDigits = onlyDigits(country);
	// Strip ALL leading zeros from the local number (cas FR/AF où "06..." est saisi)
	const localDigits = onlyDigits(local).replace(/^0+/, '');
	return countryDigits + localDigits;
}

function mapsUrl(address) {
	return `https://maps.google.com/?q=${encodeURIComponent(address || '')}`;
}

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, c => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[c]);
}

// ---------------------------------------------------------------------------
// Génération .vcf à la volée côté client
// ---------------------------------------------------------------------------
function downloadVcf(vcard) {
	const lines = [
		'BEGIN:VCARD',
		'VERSION:3.0',
		`FN:${joinName(vcard)}`,
		`N:${vcard.last_name || ''};${vcard.first_name || ''};;;`,
	];

	if (vcard.company) lines.push(`ORG:${vcard.company}`);
	if (vcard.role) lines.push(`TITLE:${vcard.role}`);
	if (vcard.phone_mobile) {
		lines.push(`TEL;TYPE=CELL:${joinPhone(vcard.phone_mobile_country, vcard.phone_mobile)}`);
	}
	if (vcard.phone_landline) {
		lines.push(`TEL;TYPE=WORK:${joinPhone(vcard.phone_landline_country, vcard.phone_landline)}`);
	}
	if (vcard.email_public) lines.push(`EMAIL:${vcard.email_public}`);
	if (vcard.address) lines.push(`ADR;TYPE=WORK:;;${vcard.address};;;;`);
	if (vcard.website_url) lines.push(`URL:${vcard.website_url}`);

	lines.push('END:VCARD');

	const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${vcard.slug || 'contact'}.vcf`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
