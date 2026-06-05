/**
 * Client API Hodi vCard.
 *
 * Remplace l'ancien client Supabase côté navigateur : toutes les opérations
 * passent désormais par le back-end PHP (/vcard/api/index.php?r=...), qui parle
 * à MySQL, gère l'authentification par cookie de session (magic-link) et le
 * stockage des fichiers en local.
 *
 * Avantages sécurité (vs accès DB direct) :
 *   - la vue publique n'expose jamais owner_email / user_id
 *   - owner_email est forcé côté serveur (impossible d'usurper l'email d'un tiers)
 *   - les URLs sont validées côté serveur (schéma http/https → anti-XSS)
 */

import { appBase } from './urls.js';
import { getLang } from './i18n.js';

/**
 * Appel bas-niveau. Renvoie le JSON décodé, lève une Error (avec .status) si !ok.
 * URLs propres : api/<route>?<query> (ex. api/slug/available?slug=x).
 */
async function call(route, { method = 'GET', body = null, query = null } = {}) {
	let url = `${appBase()}api/${route}`;
	if (query) {
		const qs = Object.entries(query)
			.filter(([, v]) => v != null)
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
		if (qs.length) url += `?${qs.join('&')}`;
	}

	const opts = { method, credentials: 'same-origin', headers: {} };
	if (body != null) {
		opts.headers['Content-Type'] = 'application/json';
		opts.body = JSON.stringify(body);
	}

	const res = await fetch(url, opts);
	let data = null;
	try {
		data = await res.json();
	} catch {
		/* réponse non-JSON (ex. erreur serveur brute) */
	}

	if (!res.ok) {
		const err = new Error((data && data.error) || `Erreur ${res.status}`);
		err.status = res.status;
		err.data = data;
		throw err;
	}
	return data;
}

// Données injectées par le rendu serveur (page.php) : { user, vcard, wallpapers? }.
// Présentes → les modules évitent les appels session()/mine()/wallpapers/list.
export const boot = (typeof window !== 'undefined' && window.__BOOT__) ? window.__BOOT__ : null;

// La session est stable le temps d'un chargement de page → on mémoïse la promesse.
// Si le serveur a déjà hydraté (boot), on part directement de sa valeur (0 round-trip).
let sessionPromise = boot ? Promise.resolve(boot.user || null) : null;

export const api = {
	auth: {
		/** @returns {Promise<{id:string,email:string}|null>} */
		session: () => {
			if (!sessionPromise) sessionPromise = call('auth/session').then((d) => d.user);
			return sessionPromise;
		},
		/** Envoie un magic-link. Fournir { email } ou { slug }. */
		requestLink: ({ email, slug, redirect } = {}) =>
			call('auth/request-link', { method: 'POST', body: { email, slug, redirect, lang: getLang() } }),
		logout: () =>
			call('auth/logout', { method: 'POST' }).then((r) => {
				sessionPromise = null; // invalide le cache de session
				return r;
			}),
	},

	vcard: {
		/** vCard publique par slug (champs publics uniquement), ou null. */
		public: (slug) => call('vcard/public', { query: { slug } }).then((d) => d.vcard),
		/** vCard du user connecté (vue propriétaire), ou null. */
		mine: () => call('vcard/mine').then((d) => d.vcard),
		create: (payload) => call('vcard/create', { method: 'POST', body: payload }).then((d) => d.vcard),
		update: (id, payload) =>
			call('vcard/update', { method: 'POST', body: { id, ...payload } }).then((d) => d.vcard),
		remove: (id) => call('vcard/delete', { method: 'POST', body: { id } }),
	},

	slugAvailable: (slug) => call('slug/available', { query: { slug } }).then((d) => d.available),
	emailHasVcard: (email) => call('email/has-vcard', { query: { email } }).then((d) => d.has_vcard),

	/** Upload d'une image (data URL). kind ∈ {avatar, cover, wallpaper}. → { url, path } */
	upload: (dataUrl, kind) => call('upload', { method: 'POST', body: { data_url: dataUrl, kind } }),

	wallpapers: {
		list: () => call('wallpapers/list').then((d) => d.wallpapers),
		create: (data) => call('wallpapers/create', { method: 'POST', body: data }).then((d) => d.wallpaper),
		remove: (id) => call('wallpapers/delete', { method: 'POST', body: { id } }),
	},

	unsplash: {
		/** La banque d'images est-elle configurée côté serveur ? */
		enabled: () => call('unsplash/enabled').then((d) => d.enabled),
		/** Recherche proxifiée → [{ thumb, full, alt, photographer, photographer_link }] */
		search: (query, orientation) =>
			call('unsplash/search', { query: { query, orientation } }).then((d) => d.results),
	},
};
