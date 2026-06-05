<?php
/**
 * Connexion PDO (singleton) vers MySQL/MariaDB.
 * Toutes les requêtes passent par des requêtes préparées → pas d'injection SQL.
 */

declare(strict_types=1);

function db(): PDO
{
	static $pdo = null;
	if ($pdo instanceof PDO) {
		return $pdo;
	}

	$cfg = require __DIR__ . '/../config.php';
	$db = $cfg['db'];

	$dsn = sprintf(
		'mysql:host=%s;port=%s;dbname=%s;charset=%s',
		$db['host'],
		$db['port'],
		$db['name'],
		$db['charset']
	);

	try {
		$pdo = new PDO($dsn, $db['user'], $db['password'], [
			PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			PDO::ATTR_EMULATE_PREPARES   => false,
		]);
	} catch (PDOException $e) {
		throw new ApiError(__('err.db_failed'), 500);
	}

	return $pdo;
}

/**
 * Helper : exécute une requête préparée et renvoie le statement.
 *
 * @param array<int|string,mixed> $params
 */
function db_run(string $sql, array $params = []): PDOStatement
{
	$stmt = db()->prepare($sql);
	$stmt->execute($params);
	return $stmt;
}

/**
 * Première ligne (ou null).
 *
 * @param array<int|string,mixed> $params
 * @return array<string,mixed>|null
 */
function db_one(string $sql, array $params = []): ?array
{
	$row = db_run($sql, $params)->fetch();
	return $row === false ? null : $row;
}

/**
 * Toutes les lignes.
 *
 * @param array<int|string,mixed> $params
 * @return array<int,array<string,mixed>>
 */
function db_all(string $sql, array $params = []): array
{
	return db_run($sql, $params)->fetchAll();
}
