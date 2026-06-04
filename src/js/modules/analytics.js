/**
 * Plausible — analytics respectueux de la vie privée (sans cookies).
 *
 * Chargé UNIQUEMENT en production (hôte hodi.host) → aucun tracking en local /
 * sur les domaines de dev. L'ID du script est une clé de config, surchargeable
 * au build via VITE_PLAUSIBLE_ID.
 */

// Clé de config : l'identifiant du script Plausible (pa-...).
const PLAUSIBLE_ID = import.meta.env.VITE_PLAUSIBLE_ID || 'pa-LEr_4nYWb0ez8P_9PEZXP';

// Hôtes considérés comme "production" (le domaine + ses sous-domaines).
const PROD_HOSTS = ['hodi.host'];

const host = window.location.hostname;
const isProd = PROD_HOSTS.some((h) => host === h || host.endsWith('.' + h));

if (isProd && PLAUSIBLE_ID) {
	const s = document.createElement('script');
	s.async = true;
	s.src = `https://plausible.io/js/${PLAUSIBLE_ID}.js`;
	document.head.appendChild(s);

	window.plausible = window.plausible || function () {
		(plausible.q = plausible.q || []).push(arguments);
	};
	window.plausible.init = window.plausible.init || function (i) {
		plausible.o = i || {};
	};
	window.plausible.init();
}
