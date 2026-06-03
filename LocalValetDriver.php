<?php
/**
 * Driver Laravel Valet pour Hodi vCard (nginx + PHP-FPM, donc PAS de .htaccess).
 *
 * Reproduit les règles de src/public/.htaccess + src/public/api/.htaccess :
 *   - sert build/ comme racine
 *   - assets / uploads / *.html / favicon → fichiers statiques
 *   - /<page>        (où <page>.html existe) → <page>.html         (URLs sans extension)
 *   - /<slug>        (segment simple inconnu) → card.html          (pretty URL vCard)
 *   - /api/<route>   → api/index.php?r=<route>                     (routeur API)
 *   - tout le reste  → index.html
 *
 * Place ce fichier à la RACINE du projet, puis `valet link` depuis cette racine
 * (Valet le détecte automatiquement). Sert l'app à la racine du domaine, comme en local Apache.
 */

use Valet\Drivers\ValetDriver;

class LocalValetDriver extends ValetDriver
{
	/** Racine servie = build/ (généré par `npm run build`). */
	private function docRoot(string $sitePath): string
	{
		return is_dir($sitePath . '/build') ? $sitePath . '/build' : $sitePath;
	}

	public function serves(string $sitePath, string $siteName, string $uri): bool
	{
		return is_file($this->docRoot($sitePath) . '/index.html');
	}

	/**
	 * Fichiers servis tels quels. Couvre aussi les URLs sans extension (page.html),
	 * les slugs de vCard (→ card.html) et le fallback (→ index.html). Tout sauf /api/*.
	 */
	public function isStaticFile(string $sitePath, string $siteName, string $uri)
	{
		if (strpos($uri, '/api') === 0) {
			return false; // → frontControllerPath (PHP)
		}

		$root = $this->docRoot($sitePath);
		$path = $root . $uri;

		// Fichier réel (assets, uploads, *.html…) — jamais un .php
		if ($uri !== '/' && is_file($path) && !preg_match('/\.php$/i', $path)) {
			return $path;
		}
		// URL sans extension → page.html
		if (preg_match('#^/[A-Za-z0-9_-]+$#', $uri) && is_file($root . $uri . '.html')) {
			return $root . $uri . '.html';
		}
		// Segment simple inconnu → pretty URL de vCard (le slug est lu côté JS dans l'URL)
		if (preg_match('#^/[A-Za-z0-9_-]+/?$#', $uri)) {
			return $root . '/card.html';
		}
		// Fallback
		return $root . '/index.html';
	}

	/** Seul /api/* est dynamique : route /api/<route> → api/index.php?r=<route>. */
	public function frontControllerPath(string $sitePath, string $siteName, string $uri)
	{
		$root = $this->docRoot($sitePath);

		if (preg_match('#^/api/(.+)$#', $uri, $m)) {
			if (!isset($_GET['r'])) {
				$_GET['r'] = rtrim($m[1], '/');
			}
		}
		$_SERVER['SCRIPT_NAME'] = '/api/index.php';
		return $root . '/api/index.php';
	}
}
