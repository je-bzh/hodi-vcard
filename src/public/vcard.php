<?php
/**
 * Rendu SERVEUR de la vCard publique (/{slug}).
 *
 * Apache/.htaccess (et le driver Valet) routent /{slug} ici. On lit la carte en
 * base, on remplit le template `card.html` (déjà buildé par Vite, assets hashés)
 * côté serveur, on injecte les meta SEO + un blob `window.__VCARD__`, puis on
 * envoie le HTML complet : la carte s'affiche instantanément (pas d'aller-retour
 * API), et le JS ne fait plus que l'enrichir (QR, .vcf, popup "Modifier").
 */

declare(strict_types=1);

require __DIR__ . '/api/lib/http.php';
require __DIR__ . '/api/lib/db.php';
require __DIR__ . '/api/lib/validate.php';
require __DIR__ . '/api/lib/auth.php';   // app_base_url()
require __DIR__ . '/api/lib/vcard.php';
if (is_file(__DIR__ . '/api/vendor/autoload.php')) {
	require_once __DIR__ . '/api/vendor/autoload.php'; // QR code (chillerlan)
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$template = file_get_contents(__DIR__ . '/card.html');
if ($template === false) {
	http_response_code(500);
	echo 'Template introuvable.';
	exit;
}

$slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
$row  = $slug !== '' ? vcard_by_slug($slug) : null;

if (!$row) {
	// Carte introuvable : 404 + drapeau pour que le JS affiche le message propre.
	http_response_code(404);
	echo inject_head_script($template, 'window.__VCARD_NOTFOUND__=' . json_encode($slug, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT));
	exit;
}

$v = vcard_public_view($row);
// QR du lien public, mis en cache (fichier) dans le dossier de l'utilisateur.
$qrSrc = qr_src($row, app_base_url() . rawurlencode((string) $v['slug']));
echo render_card($template, $v, $qrSrc);

// ===========================================================================

/**
 * @param array<string,mixed> $v
 */
function render_card(string $html, array $v, ?string $qrSrc): string
{
	$doc = new DOMDocument();
	libxml_use_internal_errors(true);
	// Le préfixe XML force l'UTF-8 ; NOIMPLIED/NODEFDTD évitent que DOMDocument
	// rajoute html/body/doctype (le template les a déjà).
	$doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
	libxml_clear_errors();
	$xp = new DOMXPath($doc);

	$first = (string) $v['first_name'];
	$last  = (string) $v['last_name'];
	$fullName = trim($first . ' ' . $last);
	$socials  = is_array($v['socials'] ?? null) ? $v['socials'] : [];

	$setText = static function (DOMXPath $xp, string $key, string $val): void {
		foreach ($xp->query('//*[@data-bind="' . $key . '"]') as $el) {
			$el->textContent = $val;
		}
	};
	$first_node = static function (DOMXPath $xp, string $q): ?DOMElement {
		$n = $xp->query($q);
		return ($n && $n->length) ? $n->item(0) : null;
	};

	// --- Nom / rôle / société ---
	$setText($xp, 'full_name', $fullName);
	render_text_or_hide($xp, 'role', (string) ($v['role'] ?? ''));
	render_text_or_hide($xp, 'company', (string) ($v['company'] ?? ''));

	// --- Cover & avatar ---
	if (!empty($v['cover_url'])) {
		if ($img = $first_node($xp, '//img[@data-bind="cover_url"]')) {
			$img->setAttribute('src', $v['cover_url']);
		}
	}
	$avatarImg = $first_node($xp, '//img[@data-bind="avatar_url"]');
	$initials  = $first_node($xp, '//*[contains(concat(" ", @class, " "), " js-avatar-initials ")]');
	if (!empty($v['avatar_url'])) {
		if ($avatarImg) {
			$avatarImg->setAttribute('src', $v['avatar_url']);
			$avatarImg->removeAttribute('style');
		}
		if ($initials) {
			$initials->setAttribute('style', 'display:none;');
		}
	} elseif ($initials) {
		$ini = strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
		$initials->textContent = $ini !== '' ? $ini : '?';
	}

	// --- Lignes d'info (email, téléphones, adresse, site) ---
	$fullMobile   = ph_join((string) ($v['phone_mobile_country'] ?? ''), (string) ($v['phone_mobile'] ?? ''));
	$fullLandline = ph_join((string) ($v['phone_landline_country'] ?? ''), (string) ($v['phone_landline'] ?? ''));
	$email = (string) ($v['email_public'] ?? '');

	render_info_row($xp, 'email_public', $email, $email, 'mailto:' . $email);
	render_info_row($xp, 'phone_mobile', (string) ($v['phone_mobile'] ?? ''), $fullMobile, 'tel:' . ph_digits($fullMobile));
	render_info_row($xp, 'phone_landline', (string) ($v['phone_landline'] ?? ''), $fullLandline, 'tel:' . ph_digits($fullLandline));
	render_info_row($xp, 'address', (string) ($v['address'] ?? ''), (string) ($v['address'] ?? ''), maps_url((string) ($v['address'] ?? '')));
	render_info_row($xp, 'website_url', (string) ($v['website_url'] ?? ''), (string) ($v['website_url'] ?? ''), (string) ($v['website_url'] ?? ''));

	// --- Document (lien personnalisé) ---
	if (!empty($v['document_url']) && !empty($v['document_label'])) {
		if ($li = $first_node($xp, '//*[@data-bind-info="document"]')) {
			$li->removeAttribute('hidden');
		}
		if ($a = $first_node($xp, '//*[@data-bind="document_label"]')) {
			$a->textContent = (string) $v['document_label'];
			$a->setAttribute('href', safe_url((string) $v['document_url']));
		}
	} else {
		if ($li = $first_node($xp, '//*[@data-bind-info="document"]')) {
			$li->setAttribute('hidden', 'hidden');
		}
	}

	// --- Boutons d'action ---
	render_action($xp, 'website_url', (string) ($v['website_url'] ?? ''));
	render_action($xp, 'booking_url', (string) ($v['booking_url'] ?? ''));

	// --- Socials ---
	render_social($xp, 'linkedin', (string) ($socials['linkedin'] ?? ''));
	render_social($xp, 'instagram', (string) ($socials['instagram'] ?? ''));
	render_social($xp, 'facebook', (string) ($socials['facebook'] ?? ''));
	render_social($xp, 'pinterest', (string) ($socials['pinterest'] ?? ''));
	$wa = '';
	if (($socials['whatsapp_enabled'] ?? false) === true && !empty($v['phone_mobile'])) {
		$wa = 'https://wa.me/' . wa_number((string) ($v['phone_mobile_country'] ?? ''), (string) $v['phone_mobile']);
	}
	render_social($xp, 'whatsapp', $wa);

	// --- Popup "Modifier" : slug (jamais l'email) ---
	if ($popup = $first_node($xp, '//*[@id="popup-modifier"]')) {
		$popup->setAttribute('data-vcard-slug', (string) $v['slug']);
	}

	// --- QR code rendu côté serveur (évite le flash placeholder → QR au load) ---
	if ($qrSrc !== null && ($qrImg = $first_node($xp, '//img[@data-bind="qr_url"]'))) {
		$qrImg->setAttribute('src', $qrSrc);
	}

	// --- Titre + meta SEO/social ---
	$title = ($fullName !== '' ? $fullName : 'vCard') . ' — Hodi vCard';
	if ($t = $first_node($xp, '//title')) {
		$t->textContent = $title;
	}
	$desc = trim(implode(' · ', array_filter([$v['role'] ?? '', $v['company'] ?? '']))) ?: $title;
	set_meta($xp, 'property', 'og:title', $fullName !== '' ? $fullName : $title);
	set_meta($xp, 'property', 'og:description', $desc);
	if (!empty($v['avatar_url'])) {
		set_meta($xp, 'property', 'og:image', (string) $v['avatar_url']);
	}

	$out = $doc->saveHTML();

	// Hydratation : window.__VCARD__ → le JS rend QR/.vcf/popup sans appel API.
	$json = json_encode($v, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
	return inject_head_script($out, 'window.__VCARD__=' . $json);
}

/** Insère un <script> inline juste avant </head>. */
function inject_head_script(string $html, string $js): string
{
	$tag = "<script>{$js}</script>";
	$pos = stripos($html, '</head>');
	return $pos === false ? $tag . $html : substr($html, 0, $pos) . $tag . substr($html, $pos);
}

function render_text_or_hide(DOMXPath $xp, string $key, string $val): void
{
	$clean = preg_replace('/[-–—,;\s]/u', '', $val) ?? '';
	foreach ($xp->query('//*[@data-bind="' . $key . '"]') as $el) {
		if ($clean === '') {
			$el->textContent = '';
			$el->setAttribute('style', 'display:none;');
		} else {
			$el->textContent = trim($val);
		}
	}
}

function render_info_row(DOMXPath $xp, string $key, string $value, string $text, string $href): void
{
	$rows = $xp->query('//*[@data-bind-info="' . $key . '"]');
	if (!$rows || !$rows->length) {
		return;
	}
	$li = $rows->item(0);
	if ($value === '') {
		$li->setAttribute('hidden', 'hidden');
		return;
	}
	$li->removeAttribute('hidden');
	$binds = $xp->query('.//*[@data-bind="' . $key . '"]', $li);
	if ($binds && $binds->length) {
		$binds->item(0)->textContent = $text;
	}
	$links = $xp->query('.//a', $li);
	if ($links && $links->length && $href !== '') {
		$links->item(0)->setAttribute('href', safe_url($href));
	}
}

function render_action(DOMXPath $xp, string $key, string $url): void
{
	$lis = $xp->query('//*[@data-bind-action="' . $key . '"]');
	if (!$lis || !$lis->length) {
		return;
	}
	$li = $lis->item(0);
	if ($url === '') {
		$li->setAttribute('hidden', 'hidden');
		return;
	}
	$li->removeAttribute('hidden');
	$a = $xp->query('.//a', $li);
	if ($a && $a->length) {
		$a->item(0)->setAttribute('href', safe_url($url));
	}
}

function render_social(DOMXPath $xp, string $key, string $url): void
{
	$lis = $xp->query('//*[@data-bind-social="' . $key . '"]');
	if (!$lis || !$lis->length) {
		return;
	}
	$li = $lis->item(0);
	if ($url === '') {
		$li->setAttribute('hidden', 'hidden');
		return;
	}
	$li->removeAttribute('hidden');
	$a = $xp->query('.//a', $li);
	if ($a && $a->length) {
		$a->item(0)->setAttribute('href', safe_url($url));
	}
}

function set_meta(DOMXPath $xp, string $attr, string $name, string $content): void
{
	$nodes = $xp->query('//meta[@' . $attr . '="' . $name . '"]');
	if ($nodes && $nodes->length) {
		$nodes->item(0)->setAttribute('content', $content);
		return;
	}
	$head = $xp->query('//head');
	if ($head && $head->length) {
		$meta = $head->item(0)->ownerDocument->createElement('meta');
		$meta->setAttribute($attr, $name);
		$meta->setAttribute('content', $content);
		$head->item(0)->appendChild($meta);
	}
}

// --- petits helpers (port de vcard-public.js) ---
function ph_digits(string $s): string { return preg_replace('/\D/', '', $s) ?? ''; }
function ph_join(string $country, string $number): string
{
	if ($number === '') { return ''; }
	return trim(($country !== '' ? $country : '+33') . ' ' . $number);
}
function wa_number(string $country, string $local): string
{
	return ph_digits($country) . preg_replace('/^0+/', '', ph_digits($local));
}
function maps_url(string $address): string
{
	return $address === '' ? '' : 'https://maps.google.com/?q=' . rawurlencode($address);
}
function safe_url(string $url): string
{
	$u = trim($url);
	if ($u === '') { return '#'; }
	if (preg_match('#^(https?:|mailto:|tel:)#i', $u)) { return $u; }
	if (preg_match('#^[a-z][a-z0-9+.\-]*:#i', $u)) { return '#'; } // schéma dangereux
	return $u;
}

/**
 * Source du QR pour l'<img>. Mis en CACHE en fichier SVG dans le dossier uploads
 * de l'utilisateur ({user_id}/qr.svg) : généré une seule fois (le slug est
 * immuable → le QR ne change jamais), puis servi en statique. Renvoie l'URL du
 * fichier ; à défaut (pas de user_id) un data URI ; null si la lib manque.
 *
 * @param array<string,mixed> $row  ligne brute (pour user_id)
 */
function qr_src(array $row, string $url): ?string
{
	if (!class_exists(\chillerlan\QRCode\QRCode::class)) {
		return null;
	}
	$userId = (string) ($row['user_id'] ?? '');

	// Pas de user_id (vcard orpheline) → data URI inline, sans cache.
	if ($userId === '' || !preg_match('/^[A-Za-z0-9-]+$/', $userId)) {
		return qr_render($url, true);
	}

	$cfg = require __DIR__ . '/api/config.php';
	$dir = rtrim($cfg['storage']['dir'], '/') . '/' . $userId;
	$file = $dir . '/qr.svg';

	if (!is_file($file)) {
		$svg = qr_render($url, false); // markup SVG brut
		if ($svg === null) {
			return null;
		}
		if (!is_dir($dir)) {
			@mkdir($dir, 0775, true);
		}
		@file_put_contents($file, $svg);
	}
	return app_base_url() . 'uploads/' . $userId . '/qr.svg';
}

/** Rend le QR en SVG. $base64=true → data URI ; false → markup SVG brut. null si erreur. */
function qr_render(string $url, bool $base64): ?string
{
	try {
		$options = new \chillerlan\QRCode\QROptions([
			'outputType'     => \chillerlan\QRCode\QRCode::OUTPUT_MARKUP_SVG,
			'eccLevel'       => \chillerlan\QRCode\QRCode::ECC_M,
			'imageBase64'    => $base64,
			'addQuietzone'   => true,
			'quietzoneSize'  => 1,
			'svgViewBoxSize' => 0,
		]);
		return (new \chillerlan\QRCode\QRCode($options))->render($url);
	} catch (\Throwable $e) {
		return null; // best-effort : le JS régénérera le QR
	}
}
