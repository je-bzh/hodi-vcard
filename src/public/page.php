<?php
/**
 * Rendu serveur des pages admin (my-info / my-wallpapers / email-signature).
 *
 * - Vérifie la session AVANT d'envoyer le HTML : si la page exige l'auth et qu'il
 *   n'y a pas de session → 302 immédiat (plus de page qui s'affiche puis "rebondit").
 * - Injecte `window.__BOOT__ = { user, vcard, wallpapers }` dans la page → les
 *   modules JS n'ont plus besoin d'appeler session()/mine()/wallpapers/list.
 *
 * my-info n'exige PAS l'auth (création anonyme possible) ; il est juste hydraté
 * si une session existe.
 */

declare(strict_types=1);

require __DIR__ . '/api/lib/http.php';
require __DIR__ . '/api/lib/db.php';
require __DIR__ . '/api/lib/validate.php';
require __DIR__ . '/api/lib/auth.php';
require __DIR__ . '/api/lib/vcard.php';

$page = (string) ($_GET['page'] ?? '');
$allowed = ['my-info', 'my-wallpapers', 'email-signature'];
if (!in_array($page, $allowed, true)) {
	http_response_code(404);
	echo 'Page inconnue.';
	exit;
}

$requiresAuth = in_array($page, ['my-wallpapers', 'email-signature'], true);
$user = current_user();

if ($requiresAuth && !$user) {
	// Gate serveur : pas de session → on n'envoie même pas la page.
	header('Location: ' . app_base_url());
	http_response_code(302);
	exit;
}

$boot = [
	'user'  => $user ? ['id' => $user['id'], 'email' => $user['email']] : null,
	'vcard' => null,
];

if ($user) {
	$row = vcard_by_user($user['id']);
	$boot['vcard'] = $row ? vcard_owner_view($row) : null;

	if ($page === 'my-wallpapers' && $row) {
		$walls = db_all(
			'SELECT id, vcard_id, image_url, storage_path, is_default, created_at
			   FROM wallpapers WHERE vcard_id = ?
			   ORDER BY is_default DESC, created_at ASC',
			[$row['id']]
		);
		foreach ($walls as &$w) {
			$w['is_default'] = (bool) $w['is_default'];
		}
		unset($w);
		$boot['wallpapers'] = $walls;
	}
}

$html = file_get_contents(__DIR__ . '/' . $page . '.html');
if ($html === false) {
	http_response_code(500);
	echo 'Template introuvable.';
	exit;
}

// Marque <html> comme prêt (auth) pour éviter tout flash, et injecte le boot.
if ($user) {
	$html = preg_replace('/<html\b/', '<html data-auth-ready', $html, 1);
}
$json = json_encode($boot, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
$script = "<script>window.__BOOT__={$json}</script>";
$pos = stripos($html, '</head>');
$html = $pos === false ? $script . $html : substr($html, 0, $pos) . $script . substr($html, $pos);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
