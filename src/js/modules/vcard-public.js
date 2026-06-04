/**
 * Affichage public de la vCard (card)
 *
 * Au chargement :
 *   - Lit le slug depuis ?slug=xxx dans l'URL
 *   - Récupère la vCard via l'API back-end
 *   - Peuple tous les bindings (nom, contacts, socials, actions)
 *   - Branche le bouton "Sauvegarder la fiche contact" (download .vcf)
 *   - Met à jour data-vcard-email du popup modifier
 *
 * Si pas de slug : affiche un message d'aide.
 * Si vcard introuvable : affiche un 404 propre.
 *
 * Activé uniquement sur la page qui a data-page="card".
 */

import { api } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';
import { buildVcardUrl, assetUrl, appBase } from '/js/utils/urls.js';
import QRCode from 'qrcode';

if ($('html').attr('data-page') === 'card') {
	// Microtask : le module doit finir de s'initialiser avant bootstrap()
	// (le chemin SSR via window.__VCARD__ rend de façon synchrone).
	Promise.resolve().then(bootstrap);
}

async function bootstrap() {
	// Rendu serveur (vcard.php) : les données sont déjà injectées dans la page →
	// pas d'appel API, on enrichit juste (QR, .vcf, popup).
	if (typeof window.__VCARD_NOTFOUND__ !== 'undefined') {
		renderNotFound(window.__VCARD_NOTFOUND__);
		return;
	}
	if (window.__VCARD__) {
		render(window.__VCARD__, true); // hydraté par le serveur → pas de re-remplissage
		return;
	}

	// Fallback (page servie en statique, sans SSR) : on récupère via l'API.
	const slug = getSlugFromUrl();
	if (!slug) {
		renderEmptyState();
		return;
	}

	let vcard;
	try {
		vcard = await api.vcard.public(slug);
	} catch (err) {
		console.error('[vcard-public] load error', err);
		renderError(err.message);
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
function render(vcard, hydrated = false) {
	// Si la page a été rendue côté serveur (vcard.php), le DOM est déjà rempli →
	// on saute tout le remplissage et on ne fait que l'enrichissement interactif.
	if (!hydrated) {
		document.title = `${joinName(vcard)} — Hodi vCard`;

		const fullMobile = joinPhone(vcard.phone_mobile_country, vcard.phone_mobile);
		const fullLandline = joinPhone(vcard.phone_landline_country, vcard.phone_landline);
		// Email affiché : email_public (l'email du compte n'est jamais exposé).
		const displayEmail = vcard.email_public || '';

		setText('full_name', joinName(vcard));
		setTextOrHide('role', vcard.role);
		setTextOrHide('company', vcard.company);
		setText('phone_mobile', fullMobile);
		setText('phone_landline', fullLandline);
		setText('email_public', displayEmail);
		setText('address', vcard.address);
		setText('website_url', vcard.website_url);

		setImg('cover_url', vcard.cover_url || assetUrl('public/assets/images/temp/bg-form.png'));

		const $avatarImg = $('[data-bind="avatar_url"]');
		const $avatarInitials = $('.js-avatar-initials');
		if (vcard.avatar_url) {
			$avatarImg.attr('src', vcard.avatar_url).show();
			$avatarInitials.hide();
		} else {
			$avatarImg.hide();
			$avatarInitials.text(computeInitials(vcard)).show();
		}

		toggleInfoRow('email_public', displayEmail, `mailto:${displayEmail}`);
		toggleInfoRow('phone_mobile', vcard.phone_mobile, `tel:${onlyDigits(fullMobile)}`);
		toggleInfoRow('phone_landline', vcard.phone_landline, `tel:${onlyDigits(fullLandline)}`);
		toggleInfoRow('address', vcard.address, mapsUrl(vcard.address));
		toggleInfoRow('website_url', vcard.website_url, vcard.website_url);

		const $docRow = $('[data-bind-info="document"]');
		if (vcard.document_url && vcard.document_label) {
			$docRow.prop('hidden', false);
			$docRow.find('[data-bind="document_label"]')
				.text(vcard.document_label)
				.attr('href', safeUrl(vcard.document_url));
		} else {
			$docRow.prop('hidden', true);
		}

		toggleAction('website_url', vcard.website_url);
		toggleAction('booking_url', vcard.booking_url);

		const socials = vcard.socials || {};
		toggleSocial('linkedin', socials.linkedin);
		toggleSocial('instagram', socials.instagram);
		toggleSocial('facebook', socials.facebook);
		toggleSocial('pinterest', socials.pinterest);
		if (socials.whatsapp_enabled === true && vcard.phone_mobile) {
			toggleSocial('whatsapp', `https://wa.me/${buildWaNumber(vcard.phone_mobile_country, vcard.phone_mobile)}`);
		} else {
			toggleSocial('whatsapp', null);
		}

		// Popup "Modifier" : slug uniquement (l'email reste privé côté serveur).
		$('#popup-modifier').attr('data-vcard-slug', vcard.slug);
	}

	// --- Enrichissement interactif (toujours, quel que soit le mode de rendu) ---
	// QR : ne régénère pas si le serveur l'a déjà posé (cf. garde dans generateQrCode).
	generateQrCode(buildVcardUrl(vcard.slug));

	// Téléchargement .vcf (embed PHOTO base64 → async)
	$('.js-vcf-download').off('click').on('click', async (e) => {
		e.preventDefault();
		try {
			await downloadVcf(vcard);
		} catch (err) {
			console.error('[vcard-public] downloadVcf error', err);
			alert(t('public.vcf_error'));
		}
	});
}

// ---------------------------------------------------------------------------
// États d'erreur
// ---------------------------------------------------------------------------
function renderEmptyState() {
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">${t('public.empty_title')}</h2>
			<p style="opacity: 0.7;">${t('public.empty_body')}</p>
			<p style="margin-top: 2.4rem;">
				<a href="/" style="color: #fff; text-decoration: underline;">${t('public.back_home')}</a>
			</p>
		</div>
	`);
	$('.section-info, .logo-container, #popup-modifier').hide();
}

function renderNotFound(slug) {
	document.title = t('public.notfound_title');
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">${t('public.notfound_title')}</h2>
			<p style="opacity: 0.7;">${t('public.notfound_body', { slug: escapeHtml(slug) })}</p>
			<p style="margin-top: 2.4rem;">
				<a href="/" style="color: #fff; text-decoration: underline;">${t('public.back_home')}</a>
			</p>
		</div>
	`);
	$('.section-info, .logo-container, #popup-modifier').hide();
}

function renderError(message) {
	$('.section-promote-card .shell').html(`
		<div style="text-align:center; padding: 6rem 2rem; color: var(--c-white);">
			<h2 style="margin-bottom: 1.6rem;">${t('public.error_title')}</h2>
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
 * Garde-fou anti-XSS (défense en profondeur — le serveur valide déjà les URLs).
 * N'autorise que http(s)/mailto/tel ; tout schéma dangereux (javascript:, data:…)
 * est neutralisé en '#'.
 */
function safeUrl(url) {
	const s = (url || '').trim();
	if (!s) return '#';
	if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
	if (/^[a-z][a-z0-9+.\-]*:/i.test(s)) return '#'; // autre schéma explicite → bloqué
	return s; // relatif / sans schéma → sûr
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
		$row.find('a').attr('href', safeUrl(href));
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
	$li.find('a').attr('href', safeUrl(url));
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
	$li.find('a').attr('href', safeUrl(url));
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
	// Déjà rendu côté serveur (vcard.php) → on ne régénère pas (évite tout flash).
	// SSR pose soit un data URI, soit l'URL du QR mis en cache (…/uploads/…/qr.svg).
	const existing = $('[data-bind="qr_url"]').attr('src') || '';
	if (existing.startsWith('data:') || /\/uploads\/.+\/qr\.svg/.test(existing)) return;
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
 *   - Legacy    : /vcard/card?slug=jerome → "jerome" (lu depuis query)
 *
 * Permet la rétro-compatibilité avec d'anciens liens partagés en `?slug=`.
 */
function getSlugFromUrl() {
	// Pretty URL : le slug est le dernier segment du pathname (après la base).
	const path = window.location.pathname || '';
	const base = appBase();
	let afterBase = path.startsWith(base) ? path.slice(base.length) : path;
	afterBase = afterBase.replace(/^\/+/, '').replace(/\/+$/, '');

	if (afterBase && !afterBase.endsWith('.html') && !afterBase.includes('/')) {
		return afterBase;
	}

	// Fallback : ?slug= (rétro-compatibilité d'anciens liens)
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
/**
 * Format vCard 3.0 (compat iOS Contacts + Android + Outlook + Gmail).
 *
 * Inclut :
 *   - N, FN (nom + nom complet)
 *   - ORG, TITLE (société + fonction)
 *   - TEL (mobile + fixe) au format international
 *   - EMAIL (= owner_email, l'email rattaché au compte Hodi)
 *   - ADR (adresse postale)
 *   - URL (site web)
 *   - PHOTO embed base64 (depuis avatar_url si dispo, sinon omis)
 *   - X-SOCIALPROFILE + URL ITEMs (LinkedIn, Instagram, Facebook, etc.)
 *   - NOTE avec lien vers la vcard publique
 */
async function downloadVcf(vcard) {
	const lines = [
		'BEGIN:VCARD',
		'VERSION:3.0',
	];

	const fn = joinName(vcard);
	if (fn) {
		lines.push(`N:${vcfEscape(vcard.last_name)};${vcfEscape(vcard.first_name)};;;`);
		lines.push(`FN:${vcfEscape(fn)}`);
	}

	if (vcard.company) lines.push(`ORG:${vcfEscape(vcard.company)}`);
	if (vcard.role) lines.push(`TITLE:${vcfEscape(vcard.role)}`);

	// Téléphones en format international (avec +, sans le 0 local)
	if (vcard.phone_mobile) {
		const cc = onlyDigits(vcard.phone_mobile_country);
		const local = onlyDigits(vcard.phone_mobile).replace(/^0+/, '');
		lines.push(`TEL;TYPE=CELL,VOICE:+${cc}${local}`);
	}
	if (vcard.phone_landline) {
		const cc = onlyDigits(vcard.phone_landline_country);
		const local = onlyDigits(vcard.phone_landline).replace(/^0+/, '');
		lines.push(`TEL;TYPE=WORK,VOICE:+${cc}${local}`);
	}

	// Email : on utilise email_public (champ de contact public, jamais l'email du compte)
	if (vcard.email_public) {
		lines.push(`EMAIL;TYPE=INTERNET:${vcfEscape(vcard.email_public)}`);
	}

	if (vcard.address) {
		// Format ADR : PO Box;Extended;Street;Locality;Region;Postal Code;Country
		// On met tout dans le champ Street pour simplicité (l'utilisateur a saisi une chaîne libre).
		lines.push(`ADR;TYPE=WORK:;;${vcfEscape(vcard.address)};;;;`);
	}

	if (vcard.website_url) lines.push(`URL:${vcfEscape(vcard.website_url)}`);
	if (vcard.booking_url) lines.push(`URL;TYPE=BOOKING:${vcfEscape(vcard.booking_url)}`);

	// Lien personnalisé (document)
	if (vcard.document_url && vcard.document_label) {
		lines.push(`URL;TYPE=${vcfEscape(vcard.document_label).replace(/[\s,;]/g, '_').toUpperCase()}:${vcfEscape(vcard.document_url)}`);
	}

	// Réseaux sociaux
	const socials = vcard.socials || {};
	const socialMap = [
		{ key: 'linkedin', type: 'LinkedIn' },
		{ key: 'instagram', type: 'Instagram' },
		{ key: 'facebook', type: 'Facebook' },
		{ key: 'pinterest', type: 'Pinterest' },
		{ key: 'snapchat', type: 'Snapchat' },
		{ key: 'tiktok', type: 'TikTok' },
		{ key: 'signal', type: 'Signal' },
		{ key: 'telegram', type: 'Telegram' },
	];
	socialMap.forEach(({ key, type }) => {
		if (socials[key]) {
			lines.push(`X-SOCIALPROFILE;TYPE=${type}:${vcfEscape(socials[key])}`);
		}
	});

	// WhatsApp (généré depuis phone_mobile si enabled)
	if (socials.whatsapp_enabled === true && vcard.phone_mobile) {
		const waUrl = `https://wa.me/${buildWaNumber(vcard.phone_mobile_country, vcard.phone_mobile)}`;
		lines.push(`X-SOCIALPROFILE;TYPE=WhatsApp:${vcfEscape(waUrl)}`);
	}

	// Lien vers la vcard publique en NOTE (pour pouvoir retrouver la page)
	const publicUrl = buildVcardUrl(vcard.slug);
	lines.push(`NOTE:vCard Hodi : ${vcfEscape(publicUrl)}`);

	// Photo (avatar) : on fetch et embed en base64 si dispo
	if (vcard.avatar_url) {
		try {
			const base64 = await fetchImageAsBase64(vcard.avatar_url);
			if (base64) {
				const { mime, data } = base64;
				const type = mime.split('/')[1].toUpperCase(); // JPEG, PNG
				// vCard 3.0 : PHOTO;ENCODING=b;TYPE=JPEG:<base64>
				// On fold les lignes à 75 chars max pour respecter la RFC
				const photoLine = `PHOTO;ENCODING=b;TYPE=${type}:${data}`;
				lines.push(foldVcfLine(photoLine));
			}
		} catch (err) {
			console.warn('[vcf] PHOTO embed failed, contact will export without photo', err);
		}
	}

	lines.push('END:VCARD');

	const vcfText = lines.join('\r\n') + '\r\n';
	const blob = new Blob([vcfText], { type: 'text/vcard;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${vcard.slug || 'contact'}.vcf`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Escape les caractères spéciaux vCard 3.0 (RFC 2426) : `\`, `,`, `;`, newline.
 */
function vcfEscape(s) {
	return (s || '')
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;');
}

/**
 * RFC 2426 : les lignes vCard doivent être pliées à 75 octets max,
 * avec continuation en commençant la ligne suivante par un espace ou tab.
 * Critique pour PHOTO base64 qui fait des milliers de caractères.
 */
function foldVcfLine(line) {
	const MAX = 75;
	if (line.length <= MAX) return line;
	const parts = [line.slice(0, MAX)];
	let rest = line.slice(MAX);
	while (rest.length > MAX - 1) {
		parts.push(' ' + rest.slice(0, MAX - 1));
		rest = rest.slice(MAX - 1);
	}
	if (rest) parts.push(' ' + rest);
	return parts.join('\r\n');
}

/**
 * Charge une image en base64 (pour embed PHOTO dans le .vcf).
 * Renvoie { mime, data } ou null si échec.
 */
async function fetchImageAsBase64(url) {
	try {
		const res = await fetch(url, { mode: 'cors' });
		if (!res.ok) return null;
		const blob = await res.blob();
		const mime = blob.type || 'image/jpeg';
		const data = await blobToBase64(blob);
		return { mime, data };
	} catch {
		return null;
	}
}

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const dataUrl = reader.result; // "data:image/jpeg;base64,/9j/4AAQ..."
			const base64 = (dataUrl || '').split(',')[1] || '';
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
