/**
 * Popup "Modifier ma vCard"
 *
 * Affiché sur la page publique ma-vcard.html lorsque :
 *   - L'URL contient le hash #modifier (clic sur le lien "> Modifier")
 *   - L'utilisateur utilise un déclencheur .js-open-modifier
 *
 * Le bouton "Recevoir le lien unique" appelle supabase.auth.signInWithOtp({email})
 * qui envoie un magic link à l'adresse owner_email associée à la vCard.
 *
 * En V1 dev : l'email est lu sur l'attribut data-vcard-email du popup
 *             (à terme : appel RPC slug → owner_email côté serveur).
 */

import { supabase } from '/js/utils/supabase.js';

const POPUP_ID = 'popup-modifier';
const HASH = '#modifier';

const $popup = $(`#${POPUP_ID}`);

/**
 * Affiche / cache le popup.
 */
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
 * Masque visuellement une adresse email : jerome@hodi.host -> j****e@h***i.host
 */
function maskEmail(email) {
	if (!email || !email.includes('@')) return '';
	const [local, domain] = email.split('@');
	const maskLocal = local.length <= 2 ? local : `${local[0]}***${local[local.length - 1]}`;
	const [name, ...tld] = domain.split('.');
	const maskName = name.length <= 2 ? name : `${name[0]}***${name[name.length - 1]}`;
	return `${maskLocal}@${maskName}.${tld.join('.')}`;
}

/**
 * Récupère l'email associé à la vCard courante.
 * V1 dev : lu sur l'attribut data-vcard-email du popup.
 * V2 prod : remplacer par un appel RPC `supabase.rpc('get_owner_email_masked', { p_slug })`
 *           qui ne renvoie qu'une version masquée, l'email réel restant côté DB.
 */
function getVcardEmail() {
	return $popup.data('vcard-email') || $popup.attr('data-vcard-email') || null;
}

/**
 * Affiche un état de succès / d'erreur dans le corps du popup.
 */
function renderState(html) {
	$popup.find('.popup__body').html(html);
}

function renderSuccess(maskedEmail) {
	renderState(`
		<h6>✓ Lien envoyé</h6>
		<p>Un lien de modification a été envoyé à <strong>${maskedEmail}</strong>.<br>
		Il est valable 1 heure. Vérifiez votre boîte mail (et les spams si rien n'arrive).</p>
		<p style="margin-top: 1.6rem; font-size: 1.2rem; opacity: 0.6;">
			Vous pouvez fermer cette fenêtre — en cliquant sur le lien reçu par email,
			vous serez connecté automatiquement.
		</p>
	`);
}

function renderError(message) {
	renderState(`
		<h6>⚠️ Impossible d'envoyer le lien</h6>
		<p>${message}</p>
		<ul class="popup__actions">
			<li>
				<a href="#" class="btn btn--blue js-request-edit-link">Réessayer</a>
			</li>
		</ul>
	`);
	// Re-bind le clic puisqu'on a réécrit le DOM
	bindRequestEditLink();
}

/**
 * Branche le click "Recevoir le lien" sur supabase.auth.signInWithOtp.
 */
function bindRequestEditLink() {
	$('.js-request-edit-link').off('click').on('click', async function (e) {
		e.preventDefault();
		const $btn = $(this);

		const email = getVcardEmail();
		if (!email) {
			renderError("Cette vCard n'a pas d'email associé.");
			return;
		}

		$btn.text('Envoi en cours…').prop('disabled', true).css('opacity', 0.7);

		try {
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
					// Quand l'utilisateur clique sur le lien dans son mail,
					// il atterrit directement sur la page d'édition.
					emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/'}mes-infos.html`,
				},
			});

			if (error) {
				console.error('[signInWithOtp]', error);
				renderError(`Erreur : ${error.message}`);
				return;
			}

			renderSuccess(maskEmail(email));
		} catch (err) {
			console.error('[signInWithOtp] exception', err);
			renderError("Une erreur réseau est survenue. Vérifiez votre connexion et réessayez.");
		}
	});
}

// --------------------------------------------------------------------------
// Bindings initiaux
// --------------------------------------------------------------------------

// Ouverture par lien direct .js-open-modifier
//   → si session valide pour le bon email : redirection directe sans popup
$('.js-open-modifier').on('click', async function (e) {
	e.preventDefault();
	if (await tryFastPath()) return;
	openPopup();
	history.replaceState(null, '', window.location.pathname + window.location.search + HASH);
});

// Ouverture si l'URL contient déjà le hash à l'arrivée
$(async function () {
	if (window.location.hash === HASH) {
		if (await tryFastPath()) return;
		openPopup();
	}
});

/**
 * Si l'utilisateur a déjà une session active dont l'email correspond
 * à l'owner_email de cette vCard, on saute le popup et on l'envoie
 * direct à la page d'édition (économie d'un OTP).
 */
async function tryFastPath() {
	const vcardEmail = $popup.attr('data-vcard-email');
	if (!vcardEmail) return false;
	try {
		const { data: { session } } = await supabase.auth.getSession();
		if (session?.user?.email &&
			session.user.email.toLowerCase() === vcardEmail.toLowerCase()) {
			window.location.assign('mes-infos.html');
			return true;
		}
	} catch (err) {
		console.warn('[modifier-popup] getSession failed', err);
	}
	return false;
}

// Fermeture par bouton close
$('.js-close-modifier').on('click', function (e) {
	e.preventDefault();
	closePopup();
});

// Fermeture par clic sur le backdrop
$popup.on('click', function (e) {
	if (e.target === this) {
		closePopup();
	}
});

// Fermeture par touche Échap
$(document).on('keydown', function (e) {
	if (e.key === 'Escape' && $popup.hasClass('is-visible')) {
		closePopup();
	}
});

// Bind initial du bouton "Recevoir le lien"
bindRequestEditLink();
