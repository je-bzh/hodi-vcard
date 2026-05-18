/**
 * Client Supabase
 *
 * Singleton exporté pour toute l'app — on l'importe avec :
 *   import { supabase } from '/js/utils/supabase.js';
 *
 * Les variables d'environnement viennent de .env (à la racine du projet).
 * Elles sont préfixées VITE_ pour que Vite les expose au navigateur.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
	// Avertit clairement en dev si .env n'est pas chargé / mal nommé.
	console.error(
		'[Supabase] Variables VITE_SUPABASE_URL et/ou VITE_SUPABASE_PUBLISHABLE_KEY manquantes. ' +
			'Vérifie le fichier .env à la racine du projet.'
	);
}

export const supabase = createClient(url, key, {
	auth: {
		// Persistance de la session dans localStorage
		persistSession: true,
		// Auto-refresh du token avant expiration
		autoRefreshToken: true,
		// Détection du token dans l'URL (utile pour les magic links qui reviennent en redirect)
		detectSessionInUrl: true,
		// On stocke la session sous une clé qui nous identifie clairement
		storageKey: 'hodi-vcard-auth',
	},
});

// Exposition en debug : utilisable depuis la console DevTools en dev.
// À retirer en production.
if (import.meta.env.DEV) {
	window.supabase = supabase;
}
