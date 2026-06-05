<?php
/**
 * Authentification — magic-links + sessions par cookie HttpOnly.
 *
 * Remplace Supabase Auth :
 *   - find_or_create_user(email)         : crée l'identité si besoin
 *   - issue_magic_link(user, redirect)   : génère un jeton usage-unique + URL
 *   - consume_magic_link(token)          : valide le jeton → ouvre une session
 *   - current_user()                     : user de la session courante (ou null)
 *   - require_auth()                     : current_user() ou 401
 */

declare(strict_types=1);

/**
 * @return array<string,mixed> {id, email}
 */
function find_or_create_user(string $email): array
{
	$email = strtolower(trim($email));
	$user = db_one('SELECT id, email FROM users WHERE email = ?', [$email]);
	if ($user) {
		return $user;
	}
	$id = uuid_v4();
	db_run('INSERT INTO users (id, email) VALUES (?, ?)', [$id, $email]);
	return ['id' => $id, 'email' => $email];
}

/**
 * Crée un jeton de magic-link et renvoie l'URL complète à envoyer par email.
 *
 * @param array<string,mixed> $user
 */
function issue_magic_link(array $user, string $redirect = 'my-info'): string
{
	$cfg = require __DIR__ . '/../config.php';

	// Anti-open-redirect : on n'autorise qu'un nom de page local (sans extension,
	// résolu en .html par Apache). Pas de slash ni de schéma → reste same-origin.
	if (!preg_match('/^[a-z0-9-]+$/', $redirect)) {
		$redirect = 'my-info';
	}

	$token = bin2hex(random_bytes(32));
	$hash = hash('sha256', $token);
	$expires = date('Y-m-d H:i:s', time() + (int) $cfg['app']['token_ttl']);

	db_run(
		'INSERT INTO auth_tokens (user_id, token_hash, redirect, expires_at) VALUES (?, ?, ?, ?)',
		[$user['id'], $hash, $redirect, $expires]
	);

	$base = app_base_url();
	return "{$base}api/auth/verify?token={$token}&redirect=" . rawurlencode($redirect);
}

/**
 * Valide un jeton de magic-link (usage unique, non expiré), ouvre une session,
 * pose le cookie, et renvoie la page de redirection.
 */
function consume_magic_link(string $token): string
{
	$hash = hash('sha256', $token);
	$row = db_one(
		'SELECT * FROM auth_tokens WHERE token_hash = ? LIMIT 1',
		[$hash]
	);

	if (!$row || $row['used_at'] !== null || strtotime($row['expires_at']) < time()) {
		throw new ApiError(__('err.link_invalid'), 400);
	}

	db_run('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [$row['id']]);
	open_session($row['user_id']);

	$redirect = $row['redirect'];
	return preg_match('/^[a-z0-9-]+$/', $redirect) ? $redirect : 'my-info';
}

/**
 * Crée une session pour un user et pose le cookie HttpOnly.
 */
function open_session(string $userId): void
{
	$cfg = require __DIR__ . '/../config.php';
	$token = bin2hex(random_bytes(32));
	$hash = hash('sha256', $token);
	$ttl = (int) $cfg['app']['session_ttl'];
	$expires = date('Y-m-d H:i:s', time() + $ttl);

	db_run(
		'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
		[$userId, $hash, $expires]
	);

	// GC opportuniste (à la connexion, opération rare) : purge les sessions expirées
	// et les magic-links expirés/consommés pour éviter que les tables ne gonflent.
	db_run('DELETE FROM sessions WHERE expires_at < NOW()');
	db_run('DELETE FROM auth_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL');

	setcookie($cfg['app']['cookie_name'], $token, [
		'expires'  => time() + $ttl,
		'path'     => '/',
		'secure'   => cookie_secure_flag($cfg),
		'httponly' => true,
		'samesite' => 'Lax',
	]);
}

/**
 * Le flag Secure du cookie : actif uniquement si la requête est en HTTPS
 * (sinon le navigateur/curl refuserait de stocker/renvoyer le cookie en HTTP).
 * config.app.cookie_secure peut le forcer à false (jamais à true sur du HTTP).
 *
 * @param array<string,mixed> $cfg
 */
function cookie_secure_flag(array $cfg): bool
{
	$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
		|| ($_SERVER['SERVER_PORT'] ?? '') === '443';
	return $https && (bool) ($cfg['app']['cookie_secure'] ?? true);
}

/**
 * Détruit la session courante (logout).
 */
function close_session(): void
{
	$cfg = require __DIR__ . '/../config.php';
	$name = $cfg['app']['cookie_name'];
	$token = $_COOKIE[$name] ?? '';
	if ($token !== '') {
		db_run('DELETE FROM sessions WHERE token_hash = ?', [hash('sha256', $token)]);
	}
	setcookie($name, '', [
		'expires'  => time() - 3600,
		'path'     => '/',
		'secure'   => cookie_secure_flag($cfg),
		'httponly' => true,
		'samesite' => 'Lax',
	]);
}

/**
 * Renvoie l'utilisateur de la session courante, ou null.
 *
 * @return array<string,mixed>|null {id, email}
 */
function current_user(): ?array
{
	static $cached = false;
	static $user = null;
	if ($cached) {
		return $user;
	}
	$cached = true;

	$cfg = require __DIR__ . '/../config.php';
	$token = $_COOKIE[$cfg['app']['cookie_name']] ?? '';
	if ($token === '') {
		return null;
	}

	$row = db_one(
		'SELECT u.id, u.email, s.expires_at
		   FROM sessions s
		   JOIN users u ON u.id = s.user_id
		  WHERE s.token_hash = ? LIMIT 1',
		[hash('sha256', $token)]
	);

	if (!$row || strtotime($row['expires_at']) < time()) {
		return null;
	}

	$user = ['id' => $row['id'], 'email' => $row['email']];
	return $user;
}

/**
 * Exige une session valide, sinon 401.
 *
 * @return array<string,mixed> {id, email}
 */
function require_auth(): array
{
	$user = current_user();
	if (!$user) {
		throw new ApiError(__('err.auth_required'), 401);
	}
	return $user;
}

/**
 * URL de base publique de l'app (ex. https://www.vcard.localhost/vcard/),
 * terminée par un slash. Configurable, sinon déduite de la requête.
 */
function app_base_url(): string
{
	$cfg = require __DIR__ . '/../config.php';
	if (!empty($cfg['app']['base_url'])) {
		return rtrim($cfg['app']['base_url'], '/') . '/';
	}

	$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443';
	$scheme = $https ? 'https' : 'http';
	$host = $_SERVER['HTTP_HOST'] ?? 'localhost';

	// On part de l'emplacement de ce script : .../<base>/api/index.php → on retire "api/index.php"
	$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'));
	$base = preg_replace('#/api$#', '', $scriptDir);
	$base = rtrim($base, '/') . '/';

	return "{$scheme}://{$host}{$base}";
}

/**
 * Masque une adresse email pour l'affichage : jerome@hodi.host → j***e@h***i.host
 */
function mask_email(string $email): string
{
	if (strpos($email, '@') === false) {
		return '';
	}
	[$local, $domain] = explode('@', $email, 2);
	$maskPart = static function (string $s): string {
		$len = strlen($s);
		if ($len <= 2) {
			return $s;
		}
		return $s[0] . '***' . $s[$len - 1];
	};
	$domainParts = explode('.', $domain);
	$name = array_shift($domainParts);
	$tld = implode('.', $domainParts);
	return $maskPart($local) . '@' . $maskPart($name) . ($tld !== '' ? '.' . $tld : '');
}
