/**
 * Sélecteur de langue dans le header.
 * Pilote l'i18n via setLang / getLang.
 */

import { getLang, setLang } from '/js/utils/i18n.js';

const LANGS = [
	{ code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
	{ code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
];

function renderSwitcher() {
	const $select = $('.js-lang-switcher');
	if (!$select.length) return;

	$select.empty();
	LANGS.forEach(l => {
		$select.append(
			$('<option>', {
				value: l.code,
				text: `${l.flag} ${l.short}`,
				selected: getLang() === l.code,
			})
		);
	});

	$select.off('change.langswitch').on('change.langswitch', function () {
		setLang($(this).val());
	});
}

$(function () {
	renderSwitcher();
});

// Re-render si la langue change ailleurs (autre composant qui appelle setLang)
$(document).on('lang:changed', () => renderSwitcher());
