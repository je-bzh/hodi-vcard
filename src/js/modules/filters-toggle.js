/**
 * Filter text.
 *
 * @returns {Void}
 */
const filterText = () => {
	const $filters = $('.js-filters').closest('.filters');
	const $filterBtn = $filters.find('.js-toggle-filters');
	const activeFilterText = $('.js-filters').find('.is-active').find('a').text();

	$filterBtn.find('span').text(activeFilterText);
};

/**
 * Toggle filters dropdown.
 */
$('.js-toggle-filters').on('click', function (e) {
	e.preventDefault();

	const $filtersToggle = $(this);

	$filtersToggle.parent().toggleClass('filters-open').find('.js-filters').stop(true).slideToggle();
	filterText();
});

/**
 * Toggle filters dropdown.
 *
 * Si le tab a un href réel (page différente), on laisse le navigateur naviguer
 * normalement. Si href="#" ou ancre, on intercepte pour gérer juste le UI state.
 */
$('.js-filters a').on('click', function (e) {
	const $filterBtn = $(this);
	const href = ($filterBtn.attr('href') || '').trim();

	// Vrai lien externe / page différente → on laisse passer pour navigation
	if (href && href !== '#' && !href.startsWith('#')) {
		return;
	}

	// Ancre ou href="#" → on bloque + on gère juste l'état actif visuel
	e.preventDefault();

	$filterBtn.closest('.js-filters').stop(true).slideUp();
	$filterBtn.closest('.filters').removeClass('filters-open');
	$filterBtn.parent().addClass('is-active').siblings().removeClass('is-active');

	filterText();
});

// Initial sync après le rendu i18n (i18n est importé avant ce module, donc ses
// traductions sont déjà appliquées au DOM-ready), puis re-sync à chaque
// changement de langue — le <span> du toggle mobile n'a pas de data-i18n.
$(function () {
	filterText();
});
$(document).on('lang:changed', filterText);
