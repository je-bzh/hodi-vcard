<?php
/**
 * Logique métier vCard : construction de payload (avec validation des URLs),
 * et sérialisation (publique vs propriétaire).
 */

declare(strict_types=1);

/** Colonnes "scalaires" texte simples du formulaire. */
const VCARD_TEXT_FIELDS = [
	'first_name', 'last_name', 'company', 'role',
	'phone_mobile', 'phone_mobile_country', 'phone_landline', 'phone_landline_country',
	'address', 'document_label',
];

/** Colonnes contenant une URL → validées contre les schémas autorisés. */
const VCARD_URL_FIELDS = ['website_url', 'booking_url', 'document_url', 'cover_url', 'avatar_url'];

/** Réseaux sociaux dont la valeur est une URL. */
const SOCIAL_URL_KEYS = ['linkedin', 'instagram', 'facebook', 'pinterest', 'snapchat', 'tiktok', 'signal', 'telegram'];

/**
 * Construit un payload propre à partir des données client.
 * Toutes les URLs sont validées (schéma http/https), sinon écartées → anti-XSS.
 *
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 */
function build_vcard_payload(array $input): array
{
	$payload = [];

	foreach (VCARD_TEXT_FIELDS as $f) {
		if (array_key_exists($f, $input)) {
			$payload[$f] = clean_text(is_string($input[$f]) ? $input[$f] : null, 190);
		}
	}

	foreach (VCARD_URL_FIELDS as $f) {
		if (array_key_exists($f, $input)) {
			$payload[$f] = clean_url(is_string($input[$f]) ? $input[$f] : null);
		}
	}

	// email_public : email de contact AFFICHÉ (optionnel, distinct de owner_email)
	if (array_key_exists('email_public', $input)) {
		$pub = clean_text(is_string($input['email_public']) ? $input['email_public'] : null, 255);
		$payload['email_public'] = ($pub !== null && is_valid_email($pub)) ? strtolower($pub) : null;
	}

	// Socials : URLs validées + flag whatsapp_enabled booléen.
	// On ne renseigne la clé QUE si le client a envoyé 'socials' → évite d'écraser
	// les réseaux existants lors d'une mise à jour partielle (ex. upload d'image seul).
	if (array_key_exists('socials', $input)) {
		$socials = [];
		$inSocials = is_array($input['socials']) ? $input['socials'] : [];
		foreach (SOCIAL_URL_KEYS as $key) {
			if (!empty($inSocials[$key]) && is_string($inSocials[$key])) {
				$url = clean_url($inSocials[$key]);
				if ($url !== null) {
					$socials[$key] = $url;
				}
			}
		}
		$socials['whatsapp_enabled'] = !empty($inSocials['whatsapp_enabled']);
		$payload['socials'] = $socials;
	}

	return $payload;
}

/**
 * Décode le champ socials (stocké en JSON) d'une row DB.
 *
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function vcard_decode_socials(array $row): array
{
	$socials = [];
	if (!empty($row['socials'])) {
		$decoded = json_decode((string) $row['socials'], true);
		if (is_array($decoded)) {
			$socials = $decoded;
		}
	}
	return $socials;
}

/**
 * Sérialisation PUBLIQUE d'une vCard.
 * SÉCURITÉ : n'expose JAMAIS owner_email ni user_id (correctif de la fuite de PII).
 * L'email affiché est email_public (choisi par l'utilisateur), pas l'email du compte.
 *
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function vcard_public_view(array $row): array
{
	return [
		'slug'                   => $row['slug'],
		'first_name'             => $row['first_name'],
		'last_name'              => $row['last_name'],
		'company'                => $row['company'],
		'role'                   => $row['role'],
		'phone_mobile'           => $row['phone_mobile'],
		'phone_mobile_country'   => $row['phone_mobile_country'],
		'phone_landline'         => $row['phone_landline'],
		'phone_landline_country' => $row['phone_landline_country'],
		'email_public'           => $row['email_public'],
		'website_url'            => $row['website_url'],
		'booking_url'            => $row['booking_url'],
		'address'                => $row['address'],
		'document_url'           => $row['document_url'],
		'document_label'         => $row['document_label'],
		'cover_url'              => $row['cover_url'],
		'avatar_url'             => $row['avatar_url'],
		'socials'                => vcard_decode_socials($row),
	];
}

/**
 * Sérialisation PROPRIÉTAIRE (page d'édition) : inclut tout sauf les internes.
 *
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function vcard_owner_view(array $row): array
{
	$view = vcard_public_view($row);
	$view['id'] = $row['id'];
	$view['owner_email'] = $row['owner_email'];
	$view['user_id'] = $row['user_id'];
	$view['rgpd_consented_at'] = $row['rgpd_consented_at'];
	return $view;
}

/** @return array<string,mixed>|null */
function vcard_by_slug(string $slug): ?array
{
	return db_one('SELECT * FROM vcards WHERE slug = ? LIMIT 1', [$slug]);
}

/** @return array<string,mixed>|null */
function vcard_by_user(string $userId): ?array
{
	return db_one('SELECT * FROM vcards WHERE user_id = ? LIMIT 1', [$userId]);
}
