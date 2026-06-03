<?php
/**
 * Envoi d'email — driver configurable (log | sendmail | smtp).
 *
 *   log      → écrit le message dans storage/mail.log (dev sans serveur mail)
 *   sendmail → si sendmail_path est défini : binaire local via isSendmail() ;
 *              sinon : fonction mail() de PHP via isMail() ('mail' = alias)
 *   smtp     → PHPMailer isSMTP() (AUTH + TLS/SSL)
 *
 * Utilise la librairie standard PHPMailer (vendor/, via Composer) plutôt qu'une
 * implémentation maison. Driver choisi via config.mail.driver.
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Envoie un email HTML. Lève ApiError en cas d'échec (sauf driver 'log').
 */
function send_mail(string $toEmail, string $subject, string $htmlBody): void
{
	$cfg = require __DIR__ . '/../config.php';
	$mail = $cfg['mail'];

	if ($mail['driver'] === 'log') {
		mail_via_log($mail, $toEmail, $subject, $htmlBody);
		return;
	}

	$autoload = __DIR__ . '/../vendor/autoload.php';
	if (!is_file($autoload)) {
		throw new ApiError('PHPMailer absent (lance `composer install` dans api/).', 500);
	}
	require_once $autoload;

	$mailer = new PHPMailer(true);
	try {
		$mailer->CharSet = 'UTF-8';

		if ($mail['driver'] === 'smtp') {
			$smtp = $mail['smtp'];
			$mailer->isSMTP();
			$mailer->Host = $smtp['host'];
			$mailer->Port = (int) $smtp['port'];
			if (!empty($smtp['user'])) {
				$mailer->SMTPAuth = true;
				$mailer->Username = $smtp['user'];
				$mailer->Password = $smtp['pass'];
			}
			$secure = strtolower((string) $smtp['secure']);
			if ($secure === 'tls') {
				$mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
			} elseif ($secure === 'ssl') {
				$mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
			}
		} elseif ($mail['driver'] === 'sendmail' || $mail['driver'] === 'mail') {
			if (!empty($mail['sendmail_path'])) {
				// Chemin fourni → binaire sendmail local (Postfix/Exim/cPanel).
				$mailer->isSendmail();
				$mailer->Sendmail = $mail['sendmail_path'];
			} else {
				// Pas de chemin → fonction mail() de PHP (utilise php.ini sendmail_path).
				$mailer->isMail();
			}
		} else {
			throw new ApiError("Driver mail inconnu : {$mail['driver']}", 500);
		}

		$mailer->setFrom($mail['from'], $mail['from_name']);
		$mailer->addAddress($toEmail);
		$mailer->isHTML(true);
		$mailer->Subject = $subject;
		$mailer->Body = $htmlBody;
		$mailer->AltBody = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody)));

		$mailer->send();
	} catch (PHPMailerException $e) {
		throw new ApiError("Échec de l'envoi de l'email : " . $mailer->ErrorInfo, 502);
	}
}

/** @param array<string,mixed> $mail */
function mail_via_log(array $mail, string $to, string $subject, string $body): void
{
	$logFile = $mail['log_file'];
	@mkdir(dirname($logFile), 0775, true);

	// On extrait les liens (href) pour qu'ils restent cliquables dans le log dev.
	preg_match_all('/href="([^"]+)"/i', $body, $links);
	$linksTxt = $links[1]
		? "LIENS:\n  " . implode("\n  ", array_map(static fn($l) => html_entity_decode($l), $links[1])) . "\n"
		: '';

	$entry = sprintf(
		"[%s] TO: %s\nSUBJECT: %s\n%s\n%s%s\n\n",
		date('Y-m-d H:i:s'),
		$to,
		$subject,
		str_repeat('-', 60),
		$linksTxt,
		strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $body))
	);
	file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}
