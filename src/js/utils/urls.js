/**
 * Helpers d'URL — point de montage détecté au runtime (un seul build).
 *
 * L'app est servie par Apache (.htaccess) soit à la racine (local :
 * https://www.vcard.localhost/), soit dans un sous-dossier (prod :
 * https://www.hodi.live/vcard/). Comme les pages ET les slugs de vCard sont
 * toujours des enfants directs du point de montage, on déduit la base absolue
 * en retirant le dernier segment du pathname courant :
 *   /vcard/my-info   → /vcard/
 *   /vcard/jerome    → /vcard/   (pretty URL d'une vCard)
 *   /my-info         → /
 * Les assets HTML/CSS sont, eux, référencés en relatif (Vite base './').
 */

/** Base absolue de l'app (ex. "/" ou "/vcard/"), terminée par un slash. */
export function appBase() {
	return window.location.pathname.replace(/[^/]*$/, '') || '/';
}

/**
 * URL publique d'une vCard à partir de son slug (pretty URL absolue, pour le QR
 * et le partage). Apache route /{slug} → card.html?slug={slug} en interne.
 *   - Local : https://www.vcard.localhost/jerome
 *   - Prod  : https://www.hodi.live/vcard/jerome
 */
export function buildVcardUrl(slug) {
	return `${window.location.origin}${appBase()}${encodeURIComponent(slug)}`;
}

/**
 * URL d'un asset statique côté JS (PNGs/SVGs). Strippe le préfixe `public/`
 * (Vite copie src/public/ vers la racine du build). Renvoie un chemin absolu
 * tenant compte du point de montage.
 *   assetUrl('public/assets/foo.png') → '/vcard/assets/foo.png' (prod) | '/assets/foo.png' (local)
 */
export function assetUrl(relPath) {
	const clean = (relPath || '')
		.replace(/^\/+/, '')       // strip leading slashes
		.replace(/^public\//, ''); // strip "public/" prefix s'il existe
	return `${appBase()}${clean}`;
}

/**
 * URL absolue d'un asset (signatures email : il faut le domaine complet pour que
 * le destinataire puisse charger les icônes).
 */
export function absoluteAssetUrl(relPath) {
	return `${window.location.origin}${assetUrl(relPath)}`;
}
