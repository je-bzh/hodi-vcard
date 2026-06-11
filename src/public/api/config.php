<?php
/**
 * Configuration de l'API Hodi vCard.
 *
 * Les valeurs par défaut conviennent au dev local (MariaDB root/root, Apache).
 * Pour surcharger sans modifier ce fichier (et sans committer de secrets),
 * créer `config.local.php` à côté — il est chargé en dernier et a la priorité.
 *
 * NB : ce fichier finit dans le build (build/api/), donc ne JAMAIS y mettre de
 * vrais secrets de prod. En prod, utiliser config.local.php (gitignored) ou des
 * variables d'environnement Apache (getenv).
 */

return (static function (): array {
	$config = [
		// --- Base de données -------------------------------------------------
		'db' => [
			'host'     => getenv('VCARD_DB_HOST') ?: '127.0.0.1',
			'port'     => getenv('VCARD_DB_PORT') ?: '3306',
			'name'     => getenv('VCARD_DB_NAME') ?: 'hodi_vcard',
			'user'     => getenv('VCARD_DB_USER') ?: 'root',
			'password' => getenv('VCARD_DB_PASS') ?: 'root',
			'charset'  => 'utf8mb4',
		],

		// --- Stockage des fichiers (uploads) ---------------------------------
		// dir : dossier "uploads" frère de api/ dans la racine servie
		//   (build/uploads en local, /vcard/uploads en prod). Servi en statique par
		//   Apache. Exclu du `--delete` rsync → persiste entre les déploiements.
		'storage' => [
			'dir'       => getenv('VCARD_UPLOAD_DIR') ?: dirname(__DIR__) . '/uploads',
			'max_bytes' => 8 * 1024 * 1024, // 8 Mo par image
		],

		// --- Email (magic-links) ---------------------------------------------
		// driver :
		//   'log'      → écrit le lien dans storage/mail.log (dev sans serveur mail)
		//   'sendmail' → si sendmail_path défini : binaire local ; sinon : mail() de PHP
		//   'smtp'     → SMTP direct (host/port/user/pass/secure)
		'mail' => [
			'driver'        => getenv('VCARD_MAIL_DRIVER') ?: 'log',
			'from'          => getenv('VCARD_MAIL_FROM') ?: 'no-reply@hodi.live',
			'from_name'     => getenv('VCARD_MAIL_FROM_NAME') ?: 'Hodi vCard',
			'log_file'      => getenv('VCARD_MAIL_LOG') ?: dirname(__DIR__, 4) . '/storage/mail.log',
			// Optionnel : chemin du binaire sendmail. Si vide → fallback mail() de PHP.
			'sendmail_path' => getenv('VCARD_SENDMAIL_PATH') ?: '', // ex. '/usr/sbin/sendmail -oi -t'
			'smtp' => [
				'host'   => getenv('VCARD_SMTP_HOST') ?: 'localhost',
				'port'   => (int) (getenv('VCARD_SMTP_PORT') ?: 587),
				'user'   => getenv('VCARD_SMTP_USER') ?: '',
				'pass'   => getenv('VCARD_SMTP_PASS') ?: '',
				'secure' => getenv('VCARD_SMTP_SECURE') ?: 'tls', // 'tls' | 'ssl' | ''
			],
		],

		// --- Banque d'images Unsplash (proxy serveur) -----------------------
		// La clé reste côté serveur (jamais dans le bundle JS). Vide → onglet désactivé.
		'unsplash' => [
			'access_key' => getenv('VCARD_UNSPLASH_KEY') ?: '',
		],

		// --- Application -----------------------------------------------------
		'app' => [
			// URL de base publique de l'app (sert à construire les magic-links).
			// Détectée automatiquement si vide.
			'base_url'        => getenv('VCARD_BASE_URL') ?: '',
			'token_ttl'       => 4 * 60 * 60,     // 4h — magic-link réutilisable tant qu'il n'a pas expiré
			'session_ttl'     => 60 * 60 * 24 * 30, // durée de vie d'une session (30 j)
			'cookie_name'     => 'hodi_vcard_session',
			'cookie_secure'   => true,            // local servi en https (vhost SSL)
			'max_wallpapers'  => 3,               // 1 défaut Hodi + 2 perso
			'allowed_schemes' => ['http', 'https'], // schémas d'URL autorisés (anti javascript:)
		],
	];

	$local = __DIR__ . '/config.local.php';
	if (is_file($local)) {
		$override = require $local;
		if (is_array($override)) {
			$config = array_replace_recursive($config, $override);
		}
	}

	return $config;
})();
