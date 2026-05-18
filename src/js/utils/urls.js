/**
 * Helpers d'URL — gèrent le sous-chemin de déploiement automatiquement.
 *
 * En dev (npm run dev)   : base = "/"        → site servi à la racine
 * En build (npm run build): base = "/vcard/"  → site déployé à www.hodi.live/vcard
 *
 * Vite expose la base configurée via import.meta.env.BASE_URL, donc le QR code
 * et les liens internes s'adaptent automatiquement selon l'environnement.
 */

const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Construit l'URL publique d'une vCard à partir de son slug.
 *   - Dev   : http://127.0.0.1:5173/ma-vcard.html?slug=jerome
 *   - Prod  : https://www.hodi.live/vcard/ma-vcard.html?slug=jerome
 */
export function buildVcardUrl(slug) {
	// BASE_URL termine toujours par '/' donc on concatène directement.
	return `${window.location.origin}${BASE_URL}ma-vcard.html?slug=${encodeURIComponent(slug)}`;
}

/**
 * Construit l'URL d'un asset statique côté JS (PNGs/SVGs).
 *
 * Strippe automatiquement le préfixe `public/` car en build Vite copie le
 * contenu de src/public/ vers build/ sans ce préfixe.
 *
 * Exemples :
 *   assetUrl('public/assets/foo.png')  → '/vcard/assets/foo.png' (prod)
 *   assetUrl('assets/foo.png')         → '/vcard/assets/foo.png' (prod)
 *   assetUrl('/assets/foo.png')        → '/vcard/assets/foo.png' (prod)
 *   En dev (base = '/'), retourne '/assets/foo.png' dans les 3 cas.
 */
export function assetUrl(relPath) {
	const clean = (relPath || '')
		.replace(/^\/+/, '')      // strip leading slashes
		.replace(/^public\//, ''); // strip "public/" prefix s'il existe
	return `${BASE_URL}${clean}`;
}

/**
 * URL absolue d'un asset (utile pour les signatures email où on a besoin du
 * domaine complet pour que le destinataire puisse charger les icônes).
 */
export function absoluteAssetUrl(relPath) {
	return new URL(assetUrl(relPath), window.location.origin).toString();
}
