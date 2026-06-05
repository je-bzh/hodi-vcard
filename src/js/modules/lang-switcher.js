/**
 * Sélecteur de langue dans le header.
 * Pilote l'i18n via setLang / getLang.
 */

import { getLang, setLang } from '/js/utils/i18n.js';

const LANGS = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
	{ code: 'sw', label: 'Kiswahili' },
];

function renderSwitcher() {
	const $select = $('.js-lang-switcher');
	if (!$select.length) return;

	$select.empty();
	LANGS.forEach(l => {
		$select.append(
			$('<option>', {
				value: l.code,
				text: l.label,
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
