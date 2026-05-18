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
 *   - Prod  : https://www.hodi.live/vcard/jerome  (pretty URL, via rewrite Apache)
 *   - Dev   : http://127.0.0.1:5173/ma-vcard.html?slug=jerome (pas de rewrite en dev)
 *
 * On détecte le contexte : en prod (BASE_URL = '/vcard/'), on génère l'URL propre.
 * En dev (BASE_URL = '/'), on garde le format query string car Vite dev server
 * ne fait pas de rewrite (équivalent de la règle .htaccess).
 */
export function buildVcardUrl(slug) {
	const cleanSlug = encodeURIComponent(slug);
	// En prod : pretty URL. En dev : query string (Vite ne rewrite pas)
	const isProd = BASE_URL !== '/' && BASE_URL !== '';
	if (isProd) {
		return `${window.location.origin}${BASE_URL}${cleanSlug}`;
	}
	return `${window.location.origin}${BASE_URL}ma-vcard.html?slug=${cleanSlug}`;
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
