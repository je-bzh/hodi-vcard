<?php
/**
 * Validation et normalisation des entrées.
 *
 * Sécurité clé : validate_url() rejette tout schéma autre que http/https.
 * C'est le correctif serveur contre le XSS stocké via des href `javascript:`
 * (un attaquant pouvait stocker website_url = "javascript:..." et l'exécuter
 * chez tout visiteur cliquant le lien sur la vCard publique).
 */

declare(strict_types=1);

function is_valid_email(string $email): bool
{
	return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function is_valid_slug(string $slug): bool
{
	return (bool) preg_match('/^[a-z0-9-]{3,50}$/', $slug);
}

/**
 * Slugs réservés : noms de pages / dossiers de l'app. Un slug égal à l'un d'eux
 * serait masqué par le routage (.htaccess sert la page/ressource au lieu de la
 * vCard) → on les traite comme "déjà pris".
 */
const RESERVED_SLUGS = [
	'api', 'uploads', 'assets', 'public',
	'index', 'home', 'card', 'edit-card', 'first-login',
	'my-info', 'my-wallpapers', 'email-signature', 'vcard-popup',
	'admin', 'www',
];

function slug_is_reserved(string $slug): bool
{
	return in_array(strtolower($slug), RESERVED_SLUGS, true);
}

/**
 * Valide/normalise une URL fournie par l'utilisateur.
 * Renvoie l'URL si le schéma est autorisé (http/https), sinon null.
 * Tolère l'absence de schéma en préfixant https://.
 */
function clean_url(?string $url): ?string
{
	$url = trim((string) $url);
	if ($url === '') {
		return null;
	}

	// Pas de schéma explicite → on suppose https (ex. "exemple.com")
	if (!preg_match('#^[a-z][a-z0-9+.\-]*:#i', $url)) {
		$url = 'https://' . $url;
	}

	$cfg = require __DIR__ . '/../config.php';
	$allowed = $cfg['app']['allowed_schemes'];

	$scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
	if (!in_array($scheme, $allowed, true)) {
		// Schéma interdit (javascript:, data:, vbscript:, file:, …) → on rejette.
		return null;
	}

	if (!filter_var($url, FILTER_VALIDATE_URL)) {
		return null;
	}

	return $url;
}

/**
 * Tronque et nettoie une chaîne texte simple.
 */
function clean_text(?string $value, int $max = 500): ?string
{
	$value = trim((string) $value);
	if ($value === '') {
		return null;
	}
	if (function_exists('mb_substr')) {
		return mb_substr($value, 0, $max);
	}
	return substr($value, 0, $max);
}
