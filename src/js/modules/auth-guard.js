/**
 * Auth Guard pour les pages admin (mes-infos, mes-fonds, signature-mail).
 *
 * Vérifie qu'une session est active (cookie de session posé par le back-end
 * lors de la consommation du magic-link). Sinon, redirige vers card.
 *
 * Ce module s'active uniquement sur les pages qui ont l'attribut data-auth-required.
 */

import { api, boot } from '/js/utils/api.js';

// On ne protège que les pages qui en ont besoin
if (document.documentElement.hasAttribute('data-auth-required')) {
	(async function checkAuth() {
		// Le serveur (page.php) a déjà gardé la page et hydraté → pas d'appel réseau.
		let user = boot ? boot.user : null;
		if (!boot) {
			try {
				user = await api.auth.session();
			} catch (err) {
				console.error('[auth-guard] session error', err);
			}
		}

		if (!user) {
			// Pas authentifié → renvoyer vers la vCard publique avec popup modifier ouvert
			console.warn('[auth-guard] Pas de session active, redirection.');
			window.location.replace('card#modifier');
			return;
		}

		// Authentifié : on rend visible le contenu (caché par CSS tant qu'on n'a pas vérifié)
		document.documentElement.setAttribute('data-auth-ready', '');

		if (import.meta.env.DEV) {
			console.log('[auth-guard] Connecté en tant que :', user.email);
		}

		// Si une fonction globale window.onAuthReady existe, on l'appelle
		// (pour que les pages admin puissent réagir, fetcher leurs données, etc.)
		if (typeof window.onAuthReady === 'function') {
			window.onAuthReady({ user });
		}
	})();
}
