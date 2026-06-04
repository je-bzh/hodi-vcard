/**
 * Signature email (email-signature)
 *
 * Génère une signature email HTML à partir des données de la vCard.
 * HTML compatible Gmail / Outlook / Apple Mail / Thunderbird :
 * table-based + inline styles uniquement, pas de flexbox.
 *
 * Activé uniquement sur la page qui a data-page="email-signature".
 */

import { api, boot } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';
import { buildVcardUrl, absoluteAssetUrl, assetUrl } from '/js/utils/urls.js';

let currentVcard = null;

// Mapping réseau → SVG (icônes monochromes colorées présentes dans /public/assets/images/svg)
// L'ordre d'itération définit l'ordre d'affichage dans la signature.
const SOCIAL_ICON_MAP = [
	{ key: 'whatsapp', label: 'WhatsApp',  icon: 'ico-soc-c-1.svg' }, // géré séparément (whatsapp_enabled)
	{ key: 'linkedin', label: 'LinkedIn',  icon: 'ico-soc-c-2.svg' },
	{ key: 'instagram', label: 'Instagram', icon: 'ico-soc-c-3.svg' },
	{ key: 'facebook',  label: 'Facebook',  icon: 'ico-soc-c-4.svg' },
];

if ($('html').attr('data-page') === 'email-signature') {
	// Microtask : laisse le module finir de s'initialiser (consts définies plus bas,
	// ex. absUrl) avant que bootstrap() ne s'exécute — le chemin hydraté (boot) est
	// synchrone et toucherait sinon des déclarations encore dans la TDZ.
	Promise.resolve().then(bootstrap);
}

async function bootstrap() {
	let vcard = null;
	try {
		const user = boot ? boot.user : await api.auth.session();
		if (!user) return; // auth-guard.js gère le redirect
		vcard = boot ? boot.vcard : await api.vcard.mine();
	} catch (err) {
		console.error('[signature-mail] load error', err);
	}

	if (!vcard) {
		renderEmptyState();
		return;
	}
	currentVcard = vcard;

	const vcardUrl = buildVcardUrl(vcard.slug);
	const socials = buildSocialsList(vcard);

	renderPreview(vcard, vcardUrl, socials);
	renderHtmlSource(vcard, vcardUrl, socials);
	bindActions();
}

function renderEmptyState() {
	$('.card-avatar').html(`
		<div style="text-align:center; padding:4rem 2rem;">
			<p style="margin-bottom: 1.6rem;">${t('signature.need_vcard')}</p>
			<a href="my-info" class="btn btn--aqua">${t('form.save_create')}</a>
		</div>
	`);
	$('.section__actions').hide();
}

/**
 * Construit la liste des socials actifs (URL renseignée) pour cette vcard,
 * dans l'ordre WhatsApp → LinkedIn → Instagram → Facebook.
 * Renvoie [{ key, label, icon, url }, ...] limité à 4 items max.
 */
function buildSocialsList(vcard) {
	const socials = vcard.socials || {};
	const list = [];

	for (const def of SOCIAL_ICON_MAP) {
		if (def.key === 'whatsapp') {
			// WhatsApp : checkbox whatsapp_enabled + phone_mobile présent
			// Format wa.me : indicatif pays + numéro local SANS le 0 de tête
			if (socials.whatsapp_enabled === true && vcard.phone_mobile) {
				const countryDigits = onlyDigits(vcard.phone_mobile_country);
				const localDigits = onlyDigits(vcard.phone_mobile).replace(/^0+/, '');
				list.push({
					...def,
					url: `https://wa.me/${countryDigits}${localDigits}`,
				});
			}
		} else if (socials[def.key]) {
			list.push({ ...def, url: socials[def.key] });
		}
	}

	return list;
}

// ---------------------------------------------------------------------------
// Preview visible dans la page
// ---------------------------------------------------------------------------
function renderPreview(vcard, vcardUrl, socials) {
	const fullName = joinName(vcard) || 'Votre nom';
	const roleCompany = [vcard.role, vcard.company].filter(Boolean).join(', ');

	// Avatar : si photo → on l'affiche. Sinon → rond bleu avec initiales prénom+nom.
	if (vcard.avatar_url) {
		$('.js-sig-avatar').attr('src', vcard.avatar_url).show();
		$('.js-sig-avatar-fallback').hide();
	} else {
		$('.js-sig-avatar').hide();
		$('.js-sig-avatar-fallback').text(getInitials(vcard)).show();
	}

	$('.js-sig-name').text(fullName);
	$('.js-sig-role-company').text(roleCompany || '');
	$('.js-sig-contact').html(buildContactLineHtml(vcard));
	$('.js-sig-vcard-link').attr('href', vcardUrl);

	// Socials sous l'avatar
	const $socials = $('.js-sig-socials').empty();
	socials.forEach((s) => {
		$socials.append(`
			<li>
				<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.label)}">
					<img src="${assetUrl('public/assets/images/svg/' + s.icon)}" alt="${escapeAttr(s.label)}">
				</a>
			</li>
		`);
	});
}

function buildContactLineHtml(vcard) {
	const mobile = joinPhone(vcard.phone_mobile_country, vcard.phone_mobile);
	const parts = [];
	if (mobile) {
		parts.push(`Tel. <a href="tel:${onlyDigits(mobile)}" style="color:#0d81fe; text-decoration:none;">${escapeHtml(mobile)}</a>`);
	}
	if (vcard.website_url) {
		parts.push(`<a href="${escapeAttr(vcard.website_url)}" style="color:#0d81fe; text-decoration:none;">${escapeHtml(prettyHost(vcard.website_url))}</a>`);
	}
	return parts.join(' - ') || '';
}

// ---------------------------------------------------------------------------
// HTML "transportable" pour les clients mail (table-based, inline styles)
// ---------------------------------------------------------------------------
function renderHtmlSource(vcard, vcardUrl, socials) {
	const html = buildSignatureHtml(vcard, vcardUrl, socials);
	document.getElementById('signature-html-source').innerHTML = html;
}

// Helper local : absoluteAssetUrl(...) du module urls.js, gère le préfixe de base.
const absUrl = absoluteAssetUrl;

function buildSignatureHtml(vcard, vcardUrl, socials) {
	const fullName = joinName(vcard) || 'Votre nom';
	const role = vcard.role || '';
	const company = vcard.company || '';
	const roleCompany = [role, company].filter(Boolean).join(', ');
	const mobile = joinPhone(vcard.phone_mobile_country, vcard.phone_mobile);
	const websiteUrl = vcard.website_url || '';
	const avatarUrl = vcard.avatar_url || '';

	const contactBits = [];
	if (mobile) {
		contactBits.push(`Tel. <a href="tel:${onlyDigits(mobile)}" style="color:#0d81fe; text-decoration:none;">${escapeHtml(mobile)}</a>`);
	}
	if (websiteUrl) {
		contactBits.push(`<a href="${escapeAttr(websiteUrl)}" style="color:#0d81fe; text-decoration:none;">${escapeHtml(prettyHost(websiteUrl))}</a>`);
	}
	const contactLine = contactBits.join(' - ');

	// Avatar : image rond si disponible, sinon cellule bleue avec initiales.
	// Compatible Gmail / Outlook / Apple Mail (table-cell + bg-color).
	const initials = getInitials(vcard);
	const avatarImg = avatarUrl
		? `<img src="${escapeAttr(avatarUrl)}" width="80" height="80" alt="" style="display:block; border-radius:50%; border:0;">`
		: `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
			<tr>
				<td width="80" height="80" align="center" valign="middle" style="width:80px; height:80px; background:#0d81fe; color:#ffffff; border-radius:50%; font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:30px; text-align:center; vertical-align:middle; line-height:80px;">${escapeHtml(initials)}</td>
			</tr>
		</table>`;

	// Icônes sociales sous l'avatar — table cellule à cellule pour Outlook
	const socialIconsHtml = socials.length
		? `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:10px; border-collapse:collapse;">
			<tr>
				${socials.map((s) => `
					<td style="padding:0 6px 0 0;">
						<a href="${escapeAttr(s.url)}" style="display:inline-block; text-decoration:none;">
							<img src="${escapeAttr(absUrl('public/assets/images/svg/' + s.icon))}" width="18" height="18" alt="${escapeAttr(s.label)}" style="display:block; border:0;">
						</a>
					</td>
				`).join('')}
			</tr>
		</table>`
		: '';

	const addContactIcon = absUrl('public/assets/images/svg/ico-user.svg');

	return `
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; color:#1f1f1f; font-size:14px; line-height:1.45;">
	<tr>
		${avatarImg ? `<td style="padding:0 20px 0 0; vertical-align:top;">${avatarImg}${socialIconsHtml}</td>` : ''}
		<td style="vertical-align:top; padding:0;">
			<p style="margin:0 0 2px; font-size:15px; font-weight:bold; color:#1f1f1f;">${escapeHtml(fullName)}</p>
			${roleCompany ? `<p style="margin:0 0 10px; font-size:14px; color:#1f1f1f;">${escapeHtml(roleCompany)}</p>` : ''}
			${contactLine ? `<p style="margin:0 0 14px; font-size:14px;">${contactLine}</p>` : ''}
			<p style="margin:0;">
				<a href="${escapeAttr(vcardUrl)}" style="color:#6b6b6b; text-decoration:underline; font-size:13px;">
					<img src="${escapeAttr(addContactIcon)}" width="14" height="14" alt="" style="vertical-align:middle; border:0; margin-right:6px;">${t('signature.add_contact')}
				</a>
			</p>
		</td>
	</tr>
</table>`.trim();
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function bindActions() {
	$('.js-sig-copy').off('click').on('click', async function (e) {
		e.preventDefault();
		const $btn = $(this);
		const originalText = $btn.text();
		try {
			await copySignatureHtml();
			showFeedback('success', t('signature.copied'));
			$btn.text(t('signature.copied_btn'));
			setTimeout(() => $btn.text(originalText), 2500);
		} catch (err) {
			console.error('[signature-mail] copy failed', err);
			showFeedback('error', t('signature.copy_error', { message: err.message }));
		}
	});

	$('.js-sig-download').off('click').on('click', function (e) {
		e.preventDefault();
		try {
			downloadSignatureHtml();
			showFeedback('success', t('signature.downloaded'));
		} catch (err) {
			console.error('[signature-mail] download failed', err);
			showFeedback('error', t('signature.copy_error', { message: err.message }));
		}
	});

	$('.js-sig-howto').off('click').on('click', function (e) {
		e.preventDefault();
		$('#popup-howto').addClass('is-visible').removeClass('not-visible');
	});

	$('.js-sig-howto-close').off('click').on('click', function (e) {
		e.preventDefault();
		$('#popup-howto').removeClass('is-visible').addClass('not-visible');
	});
}

async function copySignatureHtml() {
	const source = document.getElementById('signature-html-source');
	const html = source.innerHTML;
	const text = source.innerText;

	if (window.ClipboardItem && navigator.clipboard?.write) {
		const item = new ClipboardItem({
			'text/html': new Blob([html], { type: 'text/html' }),
			'text/plain': new Blob([text], { type: 'text/plain' }),
		});
		await navigator.clipboard.write([item]);
		return;
	}

	// Fallback execCommand
	source.style.left = '0';
	source.style.top = '0';
	source.style.position = 'fixed';
	source.style.opacity = '0';
	const range = document.createRange();
	range.selectNodeContents(source);
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	const ok = document.execCommand('copy');
	sel.removeAllRanges();
	source.style.left = '-9999px';
	source.style.top = '-9999px';
	source.style.position = 'absolute';
	source.style.opacity = '';
	if (!ok) throw new Error('execCommand copy not supported');
}

/**
 * Télécharge la signature comme fichier .html autonome (document complet),
 * que l'utilisateur peut importer dans son client mail.
 */
function downloadSignatureHtml() {
	const source = document.getElementById('signature-html-source');
	const inner = source ? source.innerHTML : '';
	const name = (currentVcard && joinName(currentVcard)) || 'Hodi vCard';

	const lang = document.documentElement.getAttribute('lang') || 'en';
	const doc = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} - ${escapeHtml(t('tabs.my_signature'))}</title>
</head>
<body>
${inner}
</body>
</html>
`;

	const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `signature-${(currentVcard && currentVcard.slug) || 'hodi'}.html`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Feedback inline avec le même style que mes-infos (palette translucide
 * sur fond aubergine, voir vcard-form.js showFeedback).
 */
function showFeedback(type, htmlMessage) {
	const $f = $('.js-sig-feedback');
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

	setTimeout(() => $f.prop('hidden', true), 4500);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function joinName(vcard) {
	return [vcard.first_name, vcard.last_name].filter(Boolean).join(' ');
}

/**
 * Renvoie les initiales (prénom + nom). Ex : "Jerome Le Grognec" → "JL".
 * Pour un seul nom : "Jerome" → "J". Fallback "?" si vide.
 */
function getInitials(vcard) {
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

function prettyHost(url) {
	try {
		const u = new URL(url);
		return u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
	} catch {
		return url;
	}
}

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[c]));
}

function escapeAttr(s) {
	return (s || '').replace(/"/g, '&quot;');
}
