<?php
/**
 * i18n côté serveur (PHP) — messages d'erreur de l'API + emails.
 *
 * La langue de la requête vient de l'en-tête X-Lang (posé par le client, =
 * langue d'interface). Repli sur 'en'. Les emails passent leur langue
 * explicitement (envoyée dans le corps de la requête).
 *
 * Usage :
 *   throw new ApiError(__('err.vcard_not_found'), 404);
 *   __('err.unsplash_error', ['code' => 502]);
 *   __('email.subject', [], 'sw');
 */

declare(strict_types=1);

const I18N_LANGS = ['en', 'fr', 'sw'];
const I18N_DEFAULT = 'en';

/** Langue de la requête courante (en-tête X-Lang), repli 'en'. */
function req_lang(): string
{
	static $lang = null;
	if ($lang !== null) {
		return $lang;
	}
	$l = strtolower(trim((string) ($_SERVER['HTTP_X_LANG'] ?? '')));
	$lang = in_array($l, I18N_LANGS, true) ? $l : I18N_DEFAULT;
	return $lang;
}

/**
 * Traduit une clé. Repli : langue demandée → 'en' → la clé brute.
 * Interpole les {paramètres}.
 *
 * @param array<string,mixed> $params
 */
function __(string $key, array $params = [], ?string $lang = null): string
{
	$lang = $lang ?? req_lang();
	$M = i18n_messages();
	$s = $M[$lang][$key] ?? $M[I18N_DEFAULT][$key] ?? $key;
	foreach ($params as $k => $v) {
		$s = str_replace('{' . $k . '}', (string) $v, $s);
	}
	return $s;
}

/** @return array<string,array<string,string>> */
function i18n_messages(): array
{
	static $M = null;
	if ($M !== null) {
		return $M;
	}

	$M = [
		'en' => [
			// Errors
			'err.method_not_allowed'    => 'Method not allowed.',
			'err.same_origin'           => 'Origin not allowed.',
			'err.json_invalid'          => 'Invalid JSON request body.',
			'err.db_failed'             => 'Could not connect to the database.',
			'err.server'                => 'Internal server error.',
			'err.route_unknown'         => 'Unknown route: {route}',
			'err.auth_required'         => 'Authentication required.',
			'err.not_authorized'        => 'Action not allowed.',
			'err.token_missing'         => 'Token missing.',
			'err.link_invalid'          => 'Invalid or expired link.',
			'err.slug_missing'          => 'Slug missing.',
			'err.email_or_slug'         => 'Email or slug required.',
			'err.email_invalid'         => 'The email address is not valid.',
			'err.vcard_no_email'        => 'This vCard has no associated email.',
			'err.email_send_failed'     => 'Failed to send the email: {message}',
			'err.already_have_vcard'    => 'You already have a vCard.',
			'err.username_invalid'      => 'Invalid username (3-50 characters: lowercase letters, digits, hyphens).',
			'err.username_taken'        => 'This username is already taken.',
			'err.name_required'         => 'First and last name are required.',
			'err.vcard_not_found'       => 'vCard not found.',
			'err.no_vcard'              => 'No vCard.',
			'err.image_type_invalid'    => 'Invalid image type.',
			'err.image_data_invalid'    => 'Invalid image (data URL expected).',
			'err.base64_failed'         => 'Base64 decoding failed.',
			'err.image_too_large'       => 'Image too large.',
			'err.image_not_valid'       => 'Invalid file (PNG/JPEG/WebP image expected).',
			'err.storage_mkdir'         => 'Could not create the storage folder.',
			'err.file_write'            => 'Could not write the file.',
			'err.storage_path_invalid'  => 'Invalid storage path.',
			'err.image_url_path_required' => 'image_url and storage_path are required.',
			'err.wallpaper_not_found'   => 'Wallpaper not found.',
			'err.unsplash_not_configured' => 'Image library not configured.',
			'err.unsplash_error'        => 'Unsplash returned an error ({code}).',
			'err.phpmailer_missing'     => 'PHPMailer missing (run `composer install` in api/).',
			'err.mail_driver_unknown'   => 'Unknown mail driver: {driver}',
			// Magic-link email
			'email.subject'  => 'Your Hodi vCard sign-in link',
			'email.greeting' => 'Hi,',
			'email.body'     => 'Click the link below to access your Hodi vCard. This link is valid for 1 hour and can only be used once.',
			'email.cta'      => 'Access my vCard',
			'email.foot'     => "If you didn't request this, you can safely ignore this email.",
		],

		'fr' => [
			'err.method_not_allowed'    => 'Méthode non autorisée.',
			'err.same_origin'           => 'Origine non autorisée.',
			'err.json_invalid'          => 'Corps de requête JSON invalide.',
			'err.db_failed'             => 'Connexion à la base de données impossible.',
			'err.server'                => 'Erreur serveur interne.',
			'err.route_unknown'         => 'Route inconnue : {route}',
			'err.auth_required'         => 'Authentification requise.',
			'err.not_authorized'        => 'Action non autorisée.',
			'err.token_missing'         => 'Jeton manquant.',
			'err.link_invalid'          => 'Lien invalide ou expiré.',
			'err.slug_missing'          => 'Slug manquant.',
			'err.email_or_slug'         => 'Email ou slug requis.',
			'err.email_invalid'         => "L'adresse email saisie n'est pas valide.",
			'err.vcard_no_email'        => "Cette vCard n'a pas d'email associé.",
			'err.email_send_failed'     => "Échec de l'envoi de l'email : {message}",
			'err.already_have_vcard'    => 'Vous avez déjà une vCard.',
			'err.username_invalid'      => 'Username invalide (3-50 caractères, lettres minuscules, chiffres, tirets).',
			'err.username_taken'        => 'Ce username est déjà pris.',
			'err.name_required'         => 'Prénom et nom sont requis.',
			'err.vcard_not_found'       => 'vCard introuvable.',
			'err.no_vcard'              => 'Aucune vCard.',
			'err.image_type_invalid'    => "Type d'image invalide.",
			'err.image_data_invalid'    => 'Image invalide (data URL attendu).',
			'err.base64_failed'         => 'Décodage base64 impossible.',
			'err.image_too_large'       => 'Image trop volumineuse.',
			'err.image_not_valid'       => 'Fichier non valide (image PNG/JPEG/WebP attendue).',
			'err.storage_mkdir'         => 'Création du dossier de stockage impossible.',
			'err.file_write'            => 'Écriture du fichier impossible.',
			'err.storage_path_invalid'  => 'Chemin de stockage invalide.',
			'err.image_url_path_required' => 'image_url et storage_path requis.',
			'err.wallpaper_not_found'   => "Fond d'écran introuvable.",
			'err.unsplash_not_configured' => "Banque d'images non configurée.",
			'err.unsplash_error'        => 'Unsplash a renvoyé une erreur ({code}).',
			'err.phpmailer_missing'     => 'PHPMailer absent (lance `composer install` dans api/).',
			'err.mail_driver_unknown'   => 'Driver mail inconnu : {driver}',
			'email.subject'  => 'Votre lien de connexion Hodi vCard',
			'email.greeting' => 'Bonjour,',
			'email.body'     => 'Cliquez sur le lien ci-dessous pour accéder à votre vCard Hodi. Ce lien est valable 1 heure et à usage unique.',
			'email.cta'      => 'Accéder à ma vCard',
			'email.foot'     => "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
		],

		'sw' => [
			'err.method_not_allowed'    => 'Mbinu hairuhusiwi.',
			'err.same_origin'           => 'Asili hairuhusiwi.',
			'err.json_invalid'          => 'Data ya ombi la JSON si sahihi.',
			'err.db_failed'             => 'Imeshindwa kuunganisha na hifadhidata.',
			'err.server'                => 'Hitilafu ya ndani ya seva.',
			'err.route_unknown'         => 'Njia haijulikani: {route}',
			'err.auth_required'         => 'Uthibitishaji unahitajika.',
			'err.not_authorized'        => 'Kitendo hakiruhusiwi.',
			'err.token_missing'         => 'Tokeni haipo.',
			'err.link_invalid'          => 'Kiungo si sahihi au kimeisha muda.',
			'err.slug_missing'          => 'Anwani ya vCard haipo.',
			'err.email_or_slug'         => 'Barua pepe au anwani ya vCard inahitajika.',
			'err.email_invalid'         => 'Anwani ya barua pepe si sahihi.',
			'err.vcard_no_email'        => 'vCard hii haina barua pepe inayohusishwa.',
			'err.email_send_failed'     => 'Imeshindwa kutuma barua pepe: {message}',
			'err.already_have_vcard'    => 'Tayari una vCard.',
			'err.username_invalid'      => 'Anwani ya vCard si sahihi (herufi 3-50: herufi ndogo, tarakimu, vistari).',
			'err.username_taken'        => 'Anwani hii ya vCard tayari imechukuliwa.',
			'err.name_required'         => 'Jina la kwanza na la familia vinahitajika.',
			'err.vcard_not_found'       => 'vCard haikupatikana.',
			'err.no_vcard'              => 'Hakuna vCard.',
			'err.image_type_invalid'    => 'Aina ya picha si sahihi.',
			'err.image_data_invalid'    => 'Picha si sahihi (data URL inatarajiwa).',
			'err.base64_failed'         => 'Imeshindwa kusimbua base64.',
			'err.image_too_large'       => 'Picha ni kubwa mno.',
			'err.image_not_valid'       => 'Faili si sahihi (picha ya PNG/JPEG/WebP inatarajiwa).',
			'err.storage_mkdir'         => 'Imeshindwa kuunda folda ya hifadhi.',
			'err.file_write'            => 'Imeshindwa kuandika faili.',
			'err.storage_path_invalid'  => 'Njia ya hifadhi si sahihi.',
			'err.image_url_path_required' => 'image_url na storage_path zinahitajika.',
			'err.wallpaper_not_found'   => 'Mandhari haikupatikana.',
			'err.unsplash_not_configured' => 'Maktaba ya picha haijasanidiwa.',
			'err.unsplash_error'        => 'Unsplash imerudisha hitilafu ({code}).',
			'err.phpmailer_missing'     => 'PHPMailer haipo (endesha `composer install` katika api/).',
			'err.mail_driver_unknown'   => 'Kiendeshi cha barua hakijulikani: {driver}',
			'email.subject'  => 'Kiungo chako cha kuingia Hodi vCard',
			'email.greeting' => 'Habari,',
			'email.body'     => 'Bofya kiungo kilicho hapa chini ili kufikia vCard yako ya Hodi. Kiungo hiki kinafanya kazi kwa saa 1 na ni cha matumizi ya mara moja.',
			'email.cta'      => 'Fikia vCard yangu',
			'email.foot'     => 'Ikiwa hukuomba hili, unaweza kupuuza barua pepe hii.',
		],
	];
	return $M;
}
