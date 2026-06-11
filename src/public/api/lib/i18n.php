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

const I18N_LANGS = ['en', 'fr', 'sw', 'pt', 'ar'];
const I18N_DEFAULT = 'en';
const I18N_RTL = ['ar'];
const LANG_COOKIE = 'hodi-vcard-lang';

/** Langue choisie persistée dans le cookie (posé par le client), ou null. */
function cookie_lang(): ?string
{
	$c = $_COOKIE[LANG_COOKIE] ?? null;
	if (!is_string($c)) {
		return null;
	}
	$c = strtolower(trim($c));
	return in_array($c, I18N_LANGS, true) ? $c : null;
}

/**
 * Langue de la requête courante : en-tête X-Lang (appels API) → cookie
 * (navigations/SSR) → repli 'en'.
 */
function req_lang(): string
{
	static $lang = null;
	if ($lang !== null) {
		return $lang;
	}
	$l = strtolower(trim((string) ($_SERVER['HTTP_X_LANG'] ?? '')));
	if (in_array($l, I18N_LANGS, true)) {
		$lang = $l;
		return $lang;
	}
	$lang = cookie_lang() ?? I18N_DEFAULT;
	return $lang;
}

/** Sens d'écriture d'une langue ('rtl' pour l'arabe, sinon 'ltr'). */
function lang_dir(string $lang): string
{
	return in_array($lang, I18N_RTL, true) ? 'rtl' : 'ltr';
}

/**
 * Réécrit la première balise <html> d'un document SSR avec lang + dir corrects
 * (déduits du cookie), afin que la page s'affiche dans la bonne langue/sens dès
 * le premier rendu, sans attendre le JS. Préserve les autres attributs.
 */
function html_with_lang(string $html, ?string $lang = null): string
{
	$lang = $lang ?? cookie_lang() ?? I18N_DEFAULT;
	$dir = lang_dir($lang);
	$out = preg_replace_callback('/<html\b([^>]*)>/i', static function (array $m) use ($lang, $dir) {
		$attrs = preg_replace('/\s+(lang|dir)="[^"]*"/i', '', $m[1]);
		return '<html' . $attrs . ' lang="' . $lang . '" dir="' . $dir . '">';
	}, $html, 1);
	return $out ?? $html;
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
			'email.body'     => 'Click the link below to access your Hodi vCard. This link is valid for 4 hours.',
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
			'email.body'     => 'Cliquez sur le lien ci-dessous pour accéder à votre vCard Hodi. Ce lien est valable 4 heures.',
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
			'email.body'     => 'Bofya kiungo kilicho hapa chini ili kufikia vCard yako ya Hodi. Kiungo hiki kinafanya kazi kwa saa 4.',
			'email.cta'      => 'Fikia vCard yangu',
			'email.foot'     => 'Ikiwa hukuomba hili, unaweza kupuuza barua pepe hii.',
		],

		'pt' => [
			'err.method_not_allowed'    => 'Método não permitido.',
			'err.same_origin'           => 'Origem não permitida.',
			'err.json_invalid'          => 'Corpo do pedido JSON inválido.',
			'err.db_failed'             => 'Não foi possível ligar à base de dados.',
			'err.server'                => 'Erro interno do servidor.',
			'err.route_unknown'         => 'Rota desconhecida: {route}',
			'err.auth_required'         => 'Autenticação necessária.',
			'err.not_authorized'        => 'Ação não permitida.',
			'err.token_missing'         => 'Token em falta.',
			'err.link_invalid'          => 'Link inválido ou expirado.',
			'err.slug_missing'          => 'Endereço do vCard em falta.',
			'err.email_or_slug'         => 'Email ou endereço do vCard é obrigatório.',
			'err.email_invalid'         => 'O endereço de email não é válido.',
			'err.vcard_no_email'        => 'Este vCard não tem email associado.',
			'err.email_send_failed'     => 'Falha ao enviar o email: {message}',
			'err.already_have_vcard'    => 'Já tem um vCard.',
			'err.username_invalid'      => 'Nome de utilizador inválido (3-50 caracteres: letras minúsculas, algarismos, hífenes).',
			'err.username_taken'        => 'Este nome de utilizador já está em uso.',
			'err.name_required'         => 'O nome próprio e o apelido são obrigatórios.',
			'err.vcard_not_found'       => 'vCard não encontrado.',
			'err.no_vcard'              => 'Nenhum vCard.',
			'err.image_type_invalid'    => 'Tipo de imagem inválido.',
			'err.image_data_invalid'    => 'Imagem inválida (esperado data URL).',
			'err.base64_failed'         => 'Falha ao descodificar base64.',
			'err.image_too_large'       => 'Imagem demasiado grande.',
			'err.image_not_valid'       => 'Ficheiro inválido (esperada imagem PNG/JPEG/WebP).',
			'err.storage_mkdir'         => 'Não foi possível criar a pasta de armazenamento.',
			'err.file_write'            => 'Não foi possível escrever o ficheiro.',
			'err.storage_path_invalid'  => 'Caminho de armazenamento inválido.',
			'err.image_url_path_required' => 'image_url e storage_path são obrigatórios.',
			'err.wallpaper_not_found'   => 'Fundo de ecrã não encontrado.',
			'err.unsplash_not_configured' => 'Biblioteca de imagens não configurada.',
			'err.unsplash_error'        => 'O Unsplash devolveu um erro ({code}).',
			'err.phpmailer_missing'     => 'PHPMailer em falta (execute `composer install` em api/).',
			'err.mail_driver_unknown'   => 'Controlador de email desconhecido: {driver}',
			'email.subject'  => 'O seu link de início de sessão Hodi vCard',
			'email.greeting' => 'Olá,',
			'email.body'     => 'Clique no link abaixo para aceder ao seu Hodi vCard. Este link é válido durante 4 horas.',
			'email.cta'      => 'Aceder ao meu vCard',
			'email.foot'     => 'Se não fez este pedido, pode ignorar este email com segurança.',
		],

		'ar' => [
			'err.method_not_allowed'    => 'الطريقة غير مسموح بها.',
			'err.same_origin'           => 'المصدر غير مسموح به.',
			'err.json_invalid'          => 'بيانات طلب JSON غير صالحة.',
			'err.db_failed'             => 'تعذّر الاتصال بقاعدة البيانات.',
			'err.server'                => 'خطأ داخلي في الخادم.',
			'err.route_unknown'         => 'مسار غير معروف: {route}',
			'err.auth_required'         => 'المصادقة مطلوبة.',
			'err.not_authorized'        => 'الإجراء غير مسموح به.',
			'err.token_missing'         => 'الرمز مفقود.',
			'err.link_invalid'          => 'الرابط غير صالح أو منتهي الصلاحية.',
			'err.slug_missing'          => 'عنوان vCard مفقود.',
			'err.email_or_slug'         => 'البريد الإلكتروني أو عنوان vCard مطلوب.',
			'err.email_invalid'         => 'عنوان البريد الإلكتروني غير صالح.',
			'err.vcard_no_email'        => 'لا يوجد بريد إلكتروني مرتبط بهذه البطاقة.',
			'err.email_send_failed'     => 'فشل إرسال البريد الإلكتروني: {message}',
			'err.already_have_vcard'    => 'لديك بطاقة vCard بالفعل.',
			'err.username_invalid'      => 'اسم مستخدم غير صالح (3-50 حرفًا: أحرف لاتينية صغيرة، أرقام، شرطات).',
			'err.username_taken'        => 'اسم المستخدم هذا مُستخدَم بالفعل.',
			'err.name_required'         => 'الاسم الأول واسم العائلة مطلوبان.',
			'err.vcard_not_found'       => 'البطاقة غير موجودة.',
			'err.no_vcard'              => 'لا توجد بطاقة.',
			'err.image_type_invalid'    => 'نوع الصورة غير صالح.',
			'err.image_data_invalid'    => 'صورة غير صالحة (المتوقع data URL).',
			'err.base64_failed'         => 'فشل فك ترميز base64.',
			'err.image_too_large'       => 'الصورة كبيرة جدًا.',
			'err.image_not_valid'       => 'ملف غير صالح (المتوقع صورة PNG/JPEG/WebP).',
			'err.storage_mkdir'         => 'تعذّر إنشاء مجلد التخزين.',
			'err.file_write'            => 'تعذّرت كتابة الملف.',
			'err.storage_path_invalid'  => 'مسار تخزين غير صالح.',
			'err.image_url_path_required' => 'الحقلان image_url و storage_path مطلوبان.',
			'err.wallpaper_not_found'   => 'الخلفية غير موجودة.',
			'err.unsplash_not_configured' => 'مكتبة الصور غير مُهيّأة.',
			'err.unsplash_error'        => 'أعاد Unsplash خطأ ({code}).',
			'err.phpmailer_missing'     => 'PHPMailer مفقود (شغّل `composer install` في api/).',
			'err.mail_driver_unknown'   => 'مُشغّل البريد غير معروف: {driver}',
			'email.subject'  => 'رابط تسجيل الدخول إلى Hodi vCard',
			'email.greeting' => 'مرحبًا،',
			'email.body'     => 'اضغط على الرابط أدناه للوصول إلى بطاقة Hodi vCard الخاصة بك. هذا الرابط صالح لمدة 4 ساعات.',
			'email.cta'      => 'الوصول إلى بطاقتي',
			'email.foot'     => 'إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
		],
	];
	return $M;
}
