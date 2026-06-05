/**
 * Wrappers autour de intl-tel-input pour les champs téléphone.
 *
 * Initialise sur tous les inputs `.js-intl-tel` (portable + ligne fixe),
 * avec drapeau cliquable, recherche par nom de pays, et format auto.
 *
 * Expose 3 helpers que vcard-form.js utilise :
 *   - initIntlPhone(input, defaultCountry) : init la lib sur un input donné
 *   - readPhone(input)                       : extrait { country, national }
 *   - writePhone(input, country, national)   : pré-remplit pour mode EDIT
 *
 * Lib : https://github.com/jackocnr/intl-tel-input (v25)
 */

import { getLang } from '/js/utils/i18n.js';

// Map des instances par <input> (intl-tel-input retourne une instance par init)
const instances = new WeakMap();

// La lib (~bundle "with utils" + flags + 240 pays) est LOURDE et n'est utile que
// sur la page d'édition. On la charge donc à la demande (chunk séparé) via import()
// dynamique, au lieu de l'embarquer dans le bundle principal chargé partout.
let libPromise = null;
function loadIntlTelInput() {
	if (!libPromise) {
		libPromise = Promise.all([
			import('intl-tel-input/intlTelInputWithUtils'),
			import('intl-tel-input/styles'),
			import('intl-tel-input/i18n'), // noms de pays traduits (ar/fr/pt/en…)
		]).then(([mod, , i18n]) => ({ factory: mod.default, i18n }));
	}
	return libPromise;
}

// Locale intl-tel-input = langue de l'app (pas celle du navigateur). La lib ne
// fournit pas de traduction sw → repli sur l'anglais.
function localeStringsFor(i18n, lang) {
	return i18n[lang] || i18n.en;
}

/**
 * Initialise intl-tel-input sur un input téléphone.
 * - country par défaut : France (ou paramétrable)
 * - recherche par nom : oui
 * - liste complète des pays
 * - séparateur de format auto à la saisie
 */
export async function initIntlPhone(input, { defaultCountry = 'fr', numberType = 'MOBILE' } = {}) {
	if (!input || instances.has(input)) return instances.get(input);

	const { factory: intlTelInput, i18n } = await loadIntlTelInput();
	if (instances.has(input)) return instances.get(input); // garde anti-course

	const iti = intlTelInput(input, {
		initialCountry: defaultCountry,
		// Langue de l'app (pas du navigateur) pour : 1) les noms de pays (via
		// Intl.DisplayNames) et 2) les libellés d'interface (recherche, aria…).
		countryNameLocale: getLang(),
		i18n: localeStringsFor(i18n, getLang()),
		separateDialCode: true,            // affiche +33 à côté de l'input (pas concaténé)
		nationalMode: true,                // l'utilisateur tape son numéro local (06...)
		formatAsYouType: true,             // espacement automatique pendant la saisie
		countrySearch: true,               // barre de recherche dans le dropdown
		countryOrder: ['fr', 'ci', 'sn', 'cm', 'cd', 'ma', 'be', 'ch'], // priorités haut de liste (v28)
		// Placeholder = numéro d'exemple du pays sélectionné (via utils), mis à jour
		// à chaque changement de pays. 'aggressive' écrase tout placeholder statique.
		autoPlaceholder: 'aggressive',
		// Type d'exemple : 'MOBILE' (portable) ou 'FIXED_LINE' (ligne fixe)
		placeholderNumberType: numberType,
		// Liste complète des pays (~240) chargée automatiquement
	});

	instances.set(input, iti);
	return iti;
}

/**
 * Lit le numéro d'un input. Renvoie { country: '+33', national: '0651051611' }
 * ou { country: '', national: '' } si le champ est vide.
 */
export function readPhone(input) {
	if (!input) return { country: '', national: '' };
	const iti = instances.get(input);
	if (!iti) {
		// Pas initialisé : fallback sur la valeur brute
		return { country: '', national: (input.value || '').trim() };
	}
	const national = (input.value || '').trim();
	if (!national) return { country: '', national: '' };

	const data = iti.getSelectedCountryData();
	const dialCode = data && data.dialCode ? `+${data.dialCode}` : '';
	return { country: dialCode, national };
}

/**
 * Pré-remplit un input avec un country code + numéro local.
 * Utilisé en mode EDIT pour charger la vcard existante.
 *   country  : '+33' (avec ou sans +) — détermine le drapeau
 *   national : '0651051611' (numéro local)
 */
export function writePhone(input, country, national) {
	if (!input) return;
	const iti = instances.get(input);
	if (!iti) {
		// Pas encore initialisé : on stocke la valeur, init la fera plus tard
		input.value = national || '';
		return;
	}
	if (country) {
		// La lib veut un code ISO ("fr", "ci"...) mais accepte aussi le dialcode
		// via setNumber("+33..."). On reconstruit le numéro complet international
		// pour qu'elle infère le pays.
		const cc = String(country).replace(/^\+/, '');
		const localDigits = (national || '').replace(/^0+/, '');
		if (cc && localDigits) {
			iti.setNumber(`+${cc}${localDigits}`);
			// Puis on remet le national dans l'input pour la saisie utilisateur
			input.value = national;
			return;
		}
	}
	input.value = national || '';
}
