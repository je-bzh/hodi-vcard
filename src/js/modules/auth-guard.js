/**
 * Auth Guard pour les pages admin (mes-infos, mes-fonds, signature-mail).
 *
 * Vérifie qu'une session Supabase est active. Sinon, redirige vers ma-vcard.html.
 *
 * Quand l'utilisateur arrive depuis un magic link, l'URL contient
 * un fragment #access_token=...&refresh_token=... que supabase-js détecte
 * automatiquement (detectSessionInUrl: true dans supabase.js) et consomme
 * pour créer la session côté navigateur.
 *
 * Ce module s'active uniquement sur les pages qui ont l'attribut data-auth-required.
 */

import { supabase } from '/js/utils/supabase.js';

// On ne protège que les pages qui en ont besoin
if (document.documentElement.hasAttribute('data-auth-required')) {
	(async function checkAuth() {
		// Laisse supabase-js consommer le fragment d'URL s'il y en a un
		await new Promise(r => setTimeout(r, 100));

		const { data: { session }, error } = await supabase.auth.getSession();

		if (error) {
			console.error('[auth-guard] getSession error', error);
		}

		if (!session) {
			// Pas authentifié → renvoyer vers la vCard publique avec popup modifier ouvert
			console.warn('[auth-guard] Pas de session active, redirection.');
			window.location.replace('ma-vcard.html#modifier');
			return;
		}

		// Authentifié : on rend visible le contenu (caché par CSS tant qu'on n'a pas vérifié)
		document.documentElement.setAttribute('data-auth-ready', '');

		// Logue l'utilisateur connecté en dev pour debug
		if (import.meta.env.DEV) {
			console.log('[auth-guard] Connecté en tant que :', session.user.email);
		}

		// Si une fonction globale window.onAuthReady existe, on l'appelle
		// (pour que les pages admin puissent réagir, fetcher leurs données, etc.)
		if (typeof window.onAuthReady === 'function') {
			window.onAuthReady(session);
		}
	})();
}
