<?php
/**
 * Front controller de l'API Hodi vCard.
 *
 * URLs propres (réécrites vers ?r=<route> par api/.htaccess) :
 *   GET  api/auth/session
 *   POST api/vcard/create
 *   GET  api/vcard/public?slug=jerome
 * (le format api/index.php?r=<route> reste accepté.)
 *
 * Remplace l'accès direct au client Supabase depuis le navigateur. L'autorisation
 * est centralisée ici (sessions cookie), les requêtes SQL sont préparées, et la
 * vue publique n'expose jamais owner_email / user_id.
 */

declare(strict_types=1);

require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/mail.php';
require __DIR__ . '/lib/vcard.php';

$config = require __DIR__ . '/config.php';

// Pas de cache sur les réponses API.
header('Cache-Control: no-store');

try {
	$route = query_param('r', '');
	$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

	switch ($route) {
		// ----- AUTH ----------------------------------------------------------
		case 'auth/session':
			$user = current_user();
			json_response(['user' => $user]);

		case 'auth/request-link':
			require_post($method);
			handle_request_link(read_json_body());

		case 'auth/verify':
			$token = query_param('token', '');
			if ($token === '') {
				throw new ApiError(__('err.token_missing'), 400);
			}
			$redirect = consume_magic_link($token);
			// Redirection navigateur vers la page demandée (session déjà posée).
			header('Location: ' . app_base_url() . $redirect);
			http_response_code(302);
			exit;

		case 'auth/logout':
			require_post($method);
			close_session();
			json_response(['ok' => true]);

		// ----- VCARD ---------------------------------------------------------
		case 'vcard/public':
			$slug = strtolower((string) query_param('slug', ''));
			if ($slug === '') {
				throw new ApiError(__('err.slug_missing'), 400);
			}
			$row = vcard_by_slug($slug);
			json_response(['vcard' => $row ? vcard_public_view($row) : null]);

		case 'vcard/mine':
			$user = require_auth();
			$row = vcard_by_user($user['id']);
			json_response(['vcard' => $row ? vcard_owner_view($row) : null]);

		case 'vcard/create':
			require_post($method);
			handle_vcard_create(read_json_body());

		case 'vcard/update':
			require_post($method);
			handle_vcard_update(read_json_body());

		case 'vcard/delete':
			require_post($method);
			handle_vcard_delete(read_json_body());

		// ----- SLUG / EMAIL --------------------------------------------------
		case 'slug/available':
			$slug = strtolower((string) query_param('slug', ''));
			if (!is_valid_slug($slug)) {
				json_response(['available' => false, 'reason' => 'invalid']);
			}
			if (slug_is_reserved($slug)) {
				// Réservé (nom de page/dossier) → traité comme "déjà pris".
				json_response(['available' => false, 'reason' => 'reserved']);
			}
			$exists = db_one('SELECT 1 FROM vcards WHERE slug = ? LIMIT 1', [$slug]);
			json_response(['available' => $exists === null]);

		case 'email/has-vcard':
			$email = strtolower((string) query_param('email', ''));
			$exists = $email !== '' && db_one('SELECT 1 FROM vcards WHERE owner_email = ? LIMIT 1', [$email]) !== null;
			json_response(['has_vcard' => $exists]);

		// ----- UPLOAD / FICHIERS --------------------------------------------
		case 'upload':
			require_post($method);
			handle_upload(read_json_body());

		// Les fichiers uploadés vivent dans build/uploads/ et sont servis en
		// statique par Apache (pas de route PHP) → URLs propres {base}uploads/...

		// ----- UNSPLASH (proxy : la clé reste côté serveur) ------------------
		case 'unsplash/enabled':
			json_response(['enabled' => $config['unsplash']['access_key'] !== '']);

		case 'unsplash/search':
			handle_unsplash_search($config);

		// ----- WALLPAPERS ----------------------------------------------------
		case 'wallpapers/list':
			handle_wallpapers_list();

		case 'wallpapers/create':
			require_post($method);
			handle_wallpapers_create(read_json_body());

		case 'wallpapers/delete':
			require_post($method);
			handle_wallpapers_delete(read_json_body());

		default:
			throw new ApiError(__('err.route_unknown', ['route' => $route]), 404);
	}
} catch (ApiError $e) {
	json_response(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
	// On ne fuite pas les détails internes au client.
	error_log('[vcard-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
	json_response(['error' => __('err.server')], 500);
}

// ===========================================================================
// Handlers
// ===========================================================================

function require_post(string $method): void
{
	if (strtoupper($method) !== 'POST') {
		throw new ApiError(__('err.method_not_allowed'), 405);
	}
}

/**
 * Exige que la requête provienne de notre propre origine (Origin ou Referer).
 * Les CORS seuls ne protègent pas un appel serveur→serveur ; ce contrôle côté
 * serveur bloque l'usage cross-site dans un navigateur et le scraping casual.
 */
function require_same_origin(): void
{
	$host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
	$src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
	$srcHost = $src !== '' ? (string) parse_url($src, PHP_URL_HOST) : '';
	if ($host === '' || $srcHost === '' || strcasecmp($srcHost, $host) !== 0) {
		throw new ApiError(__('err.same_origin'), 403);
	}
}

/**
 * Envoi d'un magic-link. Deux modes :
 *   - { email }  : flux création / récupération (l'appelant connaît son email)
 *   - { slug }   : flux "Modifier" depuis la vCard publique (l'email reste privé,
 *                  résolu côté serveur → jamais exposé au navigateur)
 *
 * @param array<string,mixed> $body
 */
function handle_request_link(array $body): void
{
	$redirect = isset($body['redirect']) && is_string($body['redirect']) ? $body['redirect'] : 'my-info';
	$email = null;

	if (!empty($body['slug']) && is_string($body['slug'])) {
		$row = vcard_by_slug(strtolower($body['slug']));
		if (!$row) {
			throw new ApiError(__('err.vcard_no_email'), 404);
		}
		$email = $row['owner_email'];
	} elseif (!empty($body['email']) && is_string($body['email'])) {
		$email = strtolower(trim($body['email']));
		if (!is_valid_email($email)) {
			throw new ApiError(__('err.email_invalid'), 400);
		}
	} else {
		throw new ApiError(__('err.email_or_slug'), 400);
	}

	$user = find_or_create_user($email);
	$link = issue_magic_link($user, $redirect);

	// Langue de l'email = langue d'interface de l'utilisateur (transmise par le client).
	$lang = isset($body['lang']) && is_string($body['lang']) ? strtolower($body['lang']) : I18N_DEFAULT;
	if (!in_array($lang, I18N_LANGS, true)) {
		$lang = I18N_DEFAULT;
	}

	try {
		$mail = magic_link_email($link, $lang);
		send_mail($email, $mail['subject'], $mail['html']);
	} catch (ApiError $e) {
		throw new ApiError(__('err.email_send_failed', ['message' => $e->getMessage()]), 502);
	}

	// On ne renvoie qu'une version masquée de l'email (jamais l'email réel en clair
	// quand l'appel vient d'un slug).
	json_response(['ok' => true, 'masked_email' => mask_email($email)]);
}

/**
 * Construit l'email du magic-link dans la langue de l'utilisateur (fr/en/sw).
 * Les chaînes viennent du catalogue i18n (lib/i18n.php). Repli sur 'en'.
 *
 * @return array{subject:string, html:string}
 */
function magic_link_email(string $link, string $lang): array
{
	$safe = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

	$html = '<p>' . __('email.greeting', [], $lang) . '</p>'
		. '<p>' . __('email.body', [], $lang) . '</p>'
		. "<p><a href=\"{$safe}\">" . __('email.cta', [], $lang) . '</a></p>'
		. '<p style="color:#888;font-size:12px">' . __('email.foot', [], $lang) . '</p>';

	return ['subject' => __('email.subject', [], $lang), 'html' => $html];
}

/**
 * Création de la vCard. owner_email est FORCÉ à l'email de session (jamais le
 * client) → on ne peut pas usurper l'email d'un tiers.
 *
 * @param array<string,mixed> $body
 */
function handle_vcard_create(array $body): void
{
	$user = require_auth();

	if (vcard_by_user($user['id'])) {
		throw new ApiError(__('err.already_have_vcard'), 409);
	}

	$slug = strtolower(trim((string) ($body['slug'] ?? '')));
	if (!is_valid_slug($slug)) {
		throw new ApiError(__('err.username_invalid'), 422);
	}
	// Réservé OU déjà utilisé → même erreur "déjà pris".
	if (slug_is_reserved($slug) || db_one('SELECT 1 FROM vcards WHERE slug = ? LIMIT 1', [$slug])) {
		throw new ApiError(__('err.username_taken'), 409);
	}

	$payload = build_vcard_payload($body);
	if (!$payload['first_name'] || !$payload['last_name']) {
		throw new ApiError(__('err.name_required'), 422);
	}

	$id = uuid_v4();
	db_run(
		'INSERT INTO vcards
			(id, slug, owner_email, user_id, first_name, last_name, company, role,
			 phone_mobile, phone_mobile_country, phone_landline, phone_landline_country,
			 email_public, website_url, booking_url, address, document_url, document_label,
			 socials, cover_url, avatar_url, rgpd_consented_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
		[
			$id, $slug, $user['email'], $user['id'],
			$payload['first_name'], $payload['last_name'], $payload['company'] ?? null, $payload['role'] ?? null,
			$payload['phone_mobile'] ?? null, $payload['phone_mobile_country'] ?? null,
			$payload['phone_landline'] ?? null, $payload['phone_landline_country'] ?? null,
			$payload['email_public'] ?? null, $payload['website_url'] ?? null, $payload['booking_url'] ?? null,
			$payload['address'] ?? null, $payload['document_url'] ?? null, $payload['document_label'] ?? null,
			json_encode($payload['socials'] ?? ['whatsapp_enabled' => false], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
			$payload['cover_url'] ?? null, $payload['avatar_url'] ?? null,
		]
	);

	$row = db_one('SELECT * FROM vcards WHERE id = ?', [$id]);
	json_response(['vcard' => vcard_owner_view($row)], 201);
}

/**
 * Mise à jour. slug et owner_email sont immuables. Propriété vérifiée.
 *
 * @param array<string,mixed> $body
 */
function handle_vcard_update(array $body): void
{
	$user = require_auth();
	$id = (string) ($body['id'] ?? '');
	$row = $id !== '' ? db_one('SELECT * FROM vcards WHERE id = ?', [$id]) : null;

	if (!$row) {
		throw new ApiError(__('err.vcard_not_found'), 404);
	}
	if ($row['user_id'] !== $user['id']) {
		throw new ApiError(__('err.not_authorized'), 403);
	}

	$payload = build_vcard_payload($body);

	$set = [];
	$params = [];
	$columns = array_merge(VCARD_TEXT_FIELDS, VCARD_URL_FIELDS, ['email_public']);
	foreach ($columns as $col) {
		if (array_key_exists($col, $payload)) {
			$set[] = "{$col} = ?";
			$params[] = $payload[$col];
		}
	}
	// socials : mis à jour uniquement si le client l'a envoyé (sinon préservé)
	if (array_key_exists('socials', $payload)) {
		$set[] = 'socials = ?';
		$params[] = json_encode($payload['socials'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	}

	if (empty($set)) {
		json_response(['vcard' => vcard_owner_view($row)]); // rien à modifier
	}

	$params[] = $id;
	db_run('UPDATE vcards SET ' . implode(', ', $set) . ' WHERE id = ?', $params);

	$row = db_one('SELECT * FROM vcards WHERE id = ?', [$id]);
	json_response(['vcard' => vcard_owner_view($row)]);
}

/**
 * Suppression de la vCard + nettoyage des fichiers (avatar, cover, wallpapers).
 *
 * @param array<string,mixed> $body
 */
function handle_vcard_delete(array $body): void
{
	$user = require_auth();
	$id = (string) ($body['id'] ?? '');
	$row = $id !== '' ? db_one('SELECT * FROM vcards WHERE id = ?', [$id]) : null;

	if (!$row) {
		throw new ApiError(__('err.vcard_not_found'), 404);
	}
	if ($row['user_id'] !== $user['id']) {
		throw new ApiError(__('err.not_authorized'), 403);
	}

	// Supprime les fichiers wallpapers connus.
	$walls = db_all('SELECT storage_path FROM wallpapers WHERE vcard_id = ?', [$id]);
	foreach ($walls as $w) {
		delete_storage_file($w['storage_path'], $user['id']);
	}
	// Supprime cover / avatar (déduit le chemin relatif depuis l'URL publique).
	foreach (['cover_url', 'avatar_url'] as $imgCol) {
		$path = storage_path_from_url($row[$imgCol] ?? null);
		if ($path !== null) {
			delete_storage_file($path, $user['id']);
		}
	}
	// QR mis en cache (rendu serveur).
	delete_storage_file($user['id'] . '/qr.svg', $user['id']);

	db_run('DELETE FROM vcards WHERE id = ?', [$id]); // cascade wallpapers
	json_response(['ok' => true]);
}

/**
 * Upload d'une image (data URL base64) vers le stockage local. Auth requise.
 * Écrit sous {user_id}/{kind}-{ts}.png et renvoie { url, path }.
 *
 * @param array<string,mixed> $body
 */
function handle_upload(array $body): void
{
	$user = require_auth();
	$cfg = require __DIR__ . '/config.php';

	$kind = (string) ($body['kind'] ?? 'image');
	if (!in_array($kind, ['avatar', 'cover', 'wallpaper'], true)) {
		throw new ApiError(__('err.image_type_invalid'), 422);
	}

	$dataUrl = (string) ($body['data_url'] ?? '');
	if (!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,#i', $dataUrl)) {
		throw new ApiError(__('err.image_data_invalid'), 422);
	}

	$b64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
	$binary = base64_decode($b64, true);
	if ($binary === false) {
		throw new ApiError(__('err.base64_failed'), 422);
	}
	if (strlen($binary) > (int) $cfg['storage']['max_bytes']) {
		throw new ApiError(__('err.image_too_large'), 413);
	}

	// On ne se fie PAS au type annoncé : on vérifie que le contenu décodé est une
	// VRAIE image, et on déduit l'extension du type réellement détecté → impossible
	// de stocker un fichier non-image (HTML/JS/PHP) déguisé en .png.
	$extByType = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp'];
	$info = @getimagesizefromstring($binary);
	if ($info === false || !isset($extByType[$info[2]])) {
		throw new ApiError(__('err.image_not_valid'), 422);
	}
	$ext = $extByType[$info[2]];

	$dir = rtrim($cfg['storage']['dir'], '/') . '/' . $user['id'];
	if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
		throw new ApiError(__('err.storage_mkdir'), 500);
	}

	$filename = $kind . '-' . time() . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
	$relPath = $user['id'] . '/' . $filename;
	$fullPath = rtrim($cfg['storage']['dir'], '/') . '/' . $relPath;

	if (file_put_contents($fullPath, $binary) === false) {
		throw new ApiError(__('err.file_write'), 500);
	}

	json_response(['url' => file_url($relPath), 'path' => $relPath], 201);
}

/**
 * URL publique d'un fichier uploadé. Les fichiers vivent dans build/uploads/ et
 * sont servis en STATIQUE par Apache → URL propre {base}uploads/{relpath}.
 */
function file_url(string $relPath): string
{
	return app_base_url() . 'uploads/' . str_replace('%2F', '/', rawurlencode($relPath));
}

/**
 * Proxy de recherche Unsplash : la clé API reste côté serveur (jamais dans le
 * bundle JS). Renvoie une liste allégée { thumb, full, alt, photographer, … }.
 *
 * @param array<string,mixed> $config
 */
function handle_unsplash_search(array $config): void
{
	require_same_origin(); // anti-abus : seulement depuis notre propre front

	$key = (string) ($config['unsplash']['access_key'] ?? '');
	if ($key === '') {
		throw new ApiError(__('err.unsplash_not_configured'), 503);
	}

	$query = trim((string) query_param('query', ''));
	if ($query === '') {
		json_response(['results' => []]);
	}
	$orientation = (string) query_param('orientation', 'portrait');
	if (!in_array($orientation, ['portrait', 'landscape', 'squarish'], true)) {
		$orientation = 'portrait';
	}

	$url = 'https://api.unsplash.com/search/photos?per_page=24'
		. '&query=' . rawurlencode(mb_substr($query, 0, 100))
		. '&orientation=' . $orientation;

	$ch = curl_init($url);
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_HTTPHEADER     => ['Authorization: Client-ID ' . $key, 'Accept-Version: v1'],
		CURLOPT_TIMEOUT        => 10,
	]);
	$body = curl_exec($ch);
	$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
	curl_close($ch);

	if ($body === false || $code < 200 || $code >= 300) {
		throw new ApiError(__('err.unsplash_error', ['code' => $code]), 502);
	}

	$data = json_decode((string) $body, true);
	$results = [];
	foreach (($data['results'] ?? []) as $p) {
		$results[] = [
			'thumb'              => $p['urls']['thumb'] ?? '',
			'full'               => $p['urls']['regular'] ?? '',
			'alt'                => $p['alt_description'] ?? '',
			'photographer'       => $p['user']['name'] ?? 'Unsplash',
			'photographer_link'  => $p['user']['links']['html'] ?? 'https://unsplash.com',
		];
	}
	json_response(['results' => $results]);
}

function handle_wallpapers_list(): void
{
	$user = require_auth();
	$vcard = vcard_by_user($user['id']);
	if (!$vcard) {
		json_response(['wallpapers' => []]);
	}
	$rows = db_all(
		'SELECT id, vcard_id, image_url, storage_path, is_default, created_at
		   FROM wallpapers WHERE vcard_id = ?
		   ORDER BY is_default DESC, created_at ASC',
		[$vcard['id']]
	);
	foreach ($rows as &$r) {
		$r['is_default'] = (bool) $r['is_default'];
	}
	json_response(['wallpapers' => $rows]);
}

/**
 * @param array<string,mixed> $body
 */
function handle_wallpapers_create(array $body): void
{
	$user = require_auth();
	$cfg = require __DIR__ . '/config.php';
	$vcard = vcard_by_user($user['id']);
	if (!$vcard) {
		throw new ApiError(__('err.no_vcard'), 404);
	}

	$imageUrl = clean_url((string) ($body['image_url'] ?? ''));
	$storagePath = (string) ($body['storage_path'] ?? '');
	if ($imageUrl === null || $storagePath === '') {
		throw new ApiError(__('err.image_url_path_required'), 422);
	}
	// Le chemin doit appartenir au dossier de l'utilisateur.
	if (strpos($storagePath, $user['id'] . '/') !== 0 || strpos($storagePath, '..') !== false) {
		throw new ApiError(__('err.storage_path_invalid'), 422);
	}

	$isDefault = !empty($body['is_default']);

	$count = (int) db_one('SELECT COUNT(*) AS c FROM wallpapers WHERE vcard_id = ?', [$vcard['id']])['c'];
	if ($count >= (int) $cfg['app']['max_wallpapers']) {
		throw new ApiError('WALLPAPERS_LIMIT', 409);
	}

	$id = uuid_v4();
	db_run(
		'INSERT INTO wallpapers (id, vcard_id, image_url, storage_path, is_default) VALUES (?,?,?,?,?)',
		[$id, $vcard['id'], $imageUrl, $storagePath, $isDefault ? 1 : 0]
	);
	$row = db_one('SELECT id, vcard_id, image_url, storage_path, is_default, created_at FROM wallpapers WHERE id = ?', [$id]);
	$row['is_default'] = (bool) $row['is_default'];
	json_response(['wallpaper' => $row], 201);
}

/**
 * @param array<string,mixed> $body
 */
function handle_wallpapers_delete(array $body): void
{
	$user = require_auth();
	$id = (string) ($body['id'] ?? '');
	$row = $id !== '' ? db_one(
		'SELECT w.* FROM wallpapers w JOIN vcards v ON v.id = w.vcard_id
		  WHERE w.id = ? AND v.user_id = ? LIMIT 1',
		[$id, $user['id']]
	) : null;

	if (!$row) {
		throw new ApiError(__('err.wallpaper_not_found'), 404);
	}

	db_run('DELETE FROM wallpapers WHERE id = ?', [$id]);
	delete_storage_file($row['storage_path'], $user['id']);
	json_response(['ok' => true]);
}

// ===========================================================================
// Stockage : helpers fichiers
// ===========================================================================

/**
 * Déduit le chemin de stockage relatif ({user}/file.png) depuis une URL publique
 * de la forme .../uploads/<relpath>.
 */
function storage_path_from_url(?string $url): ?string
{
	if (!$url) {
		return null;
	}
	$marker = '/uploads/';
	$pos = strpos($url, $marker);
	if ($pos === false) {
		return null;
	}
	return rawurldecode(substr($url, $pos + strlen($marker)));
}

/**
 * Supprime un fichier de stockage en s'assurant qu'il appartient à l'utilisateur
 * et qu'il n'y a pas de traversée de répertoire.
 */
function delete_storage_file(?string $relPath, string $userId): void
{
	if (!$relPath) {
		return;
	}
	if (strpos($relPath, '..') !== false || strpos($relPath, $userId . '/') !== 0) {
		return;
	}
	$cfg = require __DIR__ . '/config.php';
	$full = rtrim($cfg['storage']['dir'], '/') . '/' . $relPath;
	if (is_file($full)) {
		@unlink($full);
	}
}
