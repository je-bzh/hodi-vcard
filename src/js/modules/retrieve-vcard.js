/**
 * Récupération d'une vCard existante depuis la home.
 *
 * Flow :
 *   1. User clique sur "J'ai déjà une vCard"
 *   2. Popup s'ouvre avec un champ email
 *   3. User saisit son email et clique "Envoyer le lien"
 *   4. On appelle RPC `email_has_vcard` pour vérifier qu'une vCard existe
 *   5. Si oui  : on envoie un magic link qui redirige vers my-info
 *   6. Si non : message "Aucune vCard trouvée pour cet email"
 *
 * Note de sécurité : `email_has_vcard` répond toujours en HTTPS via une RPC
 * authentifiée par la publishable key. Pour éviter l'énumération d'emails,
 * on pourrait afficher le même message "Si un compte existe, vous recevrez
 * un mail" dans les deux cas. Pour l'instant, on est explicite pour l'UX.
 */

import { api } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';

$(function () {
	// N'active que sur la home (où le popup est présent)
	if (!document.getElementById('popup-retrieve')) return;

	$('.js-open-retrieve').on('click', function (e) {
		e.preventDefault();
		openPopup();
	});

	$('.js-close-retrieve').on('click', function (e) {
		e.preventDefault();
		closePopup();
	});

	// Fermer en cliquant sur le fond (en dehors du contenu)
	$('#popup-retrieve').on('click', function (e) {
		if (e.target === this) closePopup();
	});

	// Bouton "Envoyer le lien"
	$('.js-send-retrieve').on('click', async function (e) {
		e.preventDefault();
		await handleSend($(this));
	});

	// Submit on Enter
	$('.js-retrieve-email').on('keydown', function (e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			$('.js-send-retrieve').trigger('click');
		}
	});
});

function openPopup() {
	$('#popup-retrieve').removeClass('not-visible').addClass('is-visible');
	hideFeedback();
	setTimeout(() => $('.js-retrieve-email').trigger('focus'), 80);
}

function closePopup() {
	$('#popup-retrieve').removeClass('is-visible').addClass('not-visible');
	$('.js-retrieve-email').val('');
	hideFeedback();
}

async function handleSend($btn) {
	const email = $('.js-retrieve-email').val().trim().toLowerCase();
	const originalText = $btn.text();

	if (!email) {
		showFeedback('error', t('retrieve.email_required'));
		return;
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		showFeedback('error', t('error.email_invalid'));
		return;
	}

	$btn.text(t('retrieve.checking')).css('pointer-events', 'none').css('opacity', 0.7);

	try {
		// 1. Vérifier qu'une vCard existe pour cet email
		const hasVcard = await api.emailHasVcard(email);

		if (!hasVcard) {
			showFeedback('warning', t('retrieve.none', { email: escapeHtml(email) }));
			return;
		}

		// 2. Envoyer le magic link
		await api.auth.requestLink({ email, redirect: 'my-info' });

		showFeedback('success', t('retrieve.sent', { email: escapeHtml(email) }));

		// Vide le champ après succès
		$('.js-retrieve-email').val('');

	} catch (err) {
		console.error('[retrieve-vcard] unexpected', err);
		showFeedback('error', t('feedback.network_error'));
	} finally {
		$btn.text(originalText).css('pointer-events', '').css('opacity', '');
	}
}

function showFeedback(type, htmlMessage) {
	const $f = $('.js-retrieve-feedback');
	const colors = {
		success: { bg: 'rgba(34, 197, 94, 0.12)',  color: '#16a34a', border: 'rgba(34, 197, 94, 0.4)' },
		error:   { bg: 'rgba(239, 68, 68, 0.12)',  color: '#dc2626', border: 'rgba(239, 68, 68, 0.4)' },
		warning: { bg: 'rgba(250, 204, 21, 0.12)', color: '#a16207', border: 'rgba(250, 204, 21, 0.4)' },
		info:    { bg: 'rgba(96, 165, 250, 0.12)', color: '#1d4ed8', border: 'rgba(96, 165, 250, 0.4)' },
	};
	const c = colors[type] || colors.info;
	$f.html(htmlMessage)
		.css({
			padding: '1.2rem 1.4rem',
			background: c.bg,
			color: c.color,
			border: `1px solid ${c.border}`,
			'border-radius': '8px',
			'font-size': '1.3rem',
			'margin-top': '1.4rem',
			'line-height': '1.5',
		})
		.prop('hidden', false);
}

function hideFeedback() {
	$('.js-retrieve-feedback').prop('hidden', true).empty();
}

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[c]));
}
