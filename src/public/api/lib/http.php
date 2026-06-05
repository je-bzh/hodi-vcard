<?php
/**
 * Helpers HTTP : réponses JSON, lecture du corps, exceptions applicatives.
 */

declare(strict_types=1);

// i18n serveur — disponible partout (chaque point d'entrée requiert http.php en premier).
require_once __DIR__ . '/i18n.php';

/**
 * Exception métier portant un code HTTP (gérée proprement par le routeur).
 */
class ApiError extends RuntimeException
{
	public int $status;

	public function __construct(string $message, int $status = 400)
	{
		parent::__construct($message);
		$this->status = $status;
	}
}

/**
 * Envoie une réponse JSON et termine le script.
 *
 * @param mixed $data
 */
function json_response($data, int $status = 200): void
{
	http_response_code($status);
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	exit;
}

/**
 * Lit et décode le corps JSON de la requête.
 *
 * @return array<string,mixed>
 */
function read_json_body(): array
{
	$raw = file_get_contents('php://input');
	if ($raw === '' || $raw === false) {
		return [];
	}
	$data = json_decode($raw, true);
	if (!is_array($data)) {
		throw new ApiError(__('err.json_invalid'), 400);
	}
	return $data;
}

/**
 * Génère un UUID v4 (RFC 4122) sans dépendance externe.
 */
function uuid_v4(): string
{
	$bytes = random_bytes(16);
	$bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
	$bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
	return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

/**
 * Récupère une valeur de query string, avec valeur par défaut.
 */
function query_param(string $key, ?string $default = null): ?string
{
	$val = $_GET[$key] ?? null;
	if ($val === null) {
		return $default;
	}
	return is_string($val) ? trim($val) : $default;
}
