/**
 * Popup "Modifier ma vCard"
 *
 * Affiché sur la page publique card lorsque :
 *   - L'URL contient le hash #modifier (clic sur le lien "> Modifier")
 *   - L'utilisateur utilise un déclencheur .js-open-modifier
 *
 * Le bouton "Recevoir le lien unique" demande au back-end d'envoyer un magic-link.
 *
 * SÉCURITÉ : l'email du propriétaire n'est JAMAIS exposé au navigateur. On envoie
 * le slug de la vCard ; le serveur résout l'owner_email en interne, envoie le lien,
 * et ne renvoie qu'une version masquée pour l'affichage.
 */

import { api } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';

const POPUP_ID = 'popup-modifier';
const HASH = '#modifier';

const $popup = $(`#${POPUP_ID}`);

function openPopup() {
	if (!$popup.length) return;
	$popup.removeClass('not-visible').addClass('is-visible');
	setTimeout(() => $popup.find('.js-request-edit-link').focus(), 50);
}

function closePopup() {
	if (!$popup.length) return;
	$popup.removeClass('is-visible').addClass('not-visible');
	if (window.location.hash === HASH) {
		history.replaceState(null, '', window.location.pathname + window.location.search);
	}
}

/**
 * Slug de la vCard courante : posé par vcard-public.js sur le popup,
 * sinon déduit de l'URL (pretty URL ou ?slug=).
 */
function getVcardSlug() {
	const fromAttr = $popup.attr('data-vcard-slug');
	if (fromAttr) return fromAttr;
	const qs = new URLSearchParams(window.location.search).get('slug');
	if (qs) return qs;
	const seg = (window.location.pathname || '').replace(/\/+$/, '').split('/').pop();
	return seg && !seg.endsWith('.html') ? seg : null;
}

function renderState(html) {
	$popup.find('.popup__body').html(html);
}

function renderSuccess(maskedEmail) {
	renderState(`
		<h6>${t('modify.sent_title')}</h6>
		<p>${t('modify.sent_description', { email: escapeHtml(maskedEmail) })}</p>
		<p style="margin-top: 1.6rem; font-size: 1.2rem; opacity: 0.6;">
			${t('modify.sent_footnote')}
		</p>
	`);
}

function renderError(message) {
	renderState(`
		<h6>⚠️ ${t('modify.error_title')}</h6>
		<p>${escapeHtml(message)}</p>
		<ul class="popup__actions">
			<li>
				<a href="#" class="btn btn--blue js-request-edit-link">${t('common.retry')}</a>
			</li>
		</ul>
	`);
	bindRequestEditLink();
}

function bindRequestEditLink() {
	$('.js-request-edit-link').off('click').on('click', async function (e) {
		e.preventDefault();
		const $btn = $(this);

		const slug = getVcardSlug();
		if (!slug) {
			renderError(t('modify.error_no_email'));
			return;
		}

		$btn.text(t('modify.sending')).prop('disabled', true).css('opacity', 0.7);

		try {
			const res = await api.auth.requestLink({ slug, redirect: 'my-info' });
			renderSuccess(res.masked_email || '');
		} catch (err) {
			console.error('[modifier-popup] requestLink', err);
			renderError(err.message || t('modify.error_network'));
		}
	});
}

// --------------------------------------------------------------------------
// Bindings initiaux
// --------------------------------------------------------------------------

$('.js-open-modifier').on('click', async function (e) {
	e.preventDefault();
	if (await tryFastPath()) return;
	openPopup();
	history.replaceState(null, '', window.location.pathname + window.location.search + HASH);
});

$(async function () {
	if (window.location.hash === HASH) {
		if (await tryFastPath()) return;
		openPopup();
	}
});

/**
 * Si l'utilisateur a déjà une session active ET qu'elle correspond à la vCard
 * affichée (même slug), on saute le popup et on l'envoie direct à l'édition.
 * La comparaison se fait via le serveur (api.vcard.mine), sans exposer d'email.
 */
async function tryFastPath() {
	const slug = getVcardSlug();
	if (!slug) return false;
	try {
		const user = await api.auth.session();
		if (!user) return false;
		const mine = await api.vcard.mine();
		if (mine && mine.slug && mine.slug.toLowerCase() === slug.toLowerCase()) {
			window.location.assign('my-info');
			return true;
		}
	} catch (err) {
		console.warn('[modifier-popup] fast path failed', err);
	}
	return false;
}

$('.js-close-modifier').on('click', function (e) {
	e.preventDefault();
	closePopup();
});

$popup.on('click', function (e) {
	if (e.target === this) {
		closePopup();
	}
});

$(document).on('keydown', function (e) {
	if (e.key === 'Escape' && $popup.hasClass('is-visible')) {
		closePopup();
	}
});

bindRequestEditLink();

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[c]));
}
