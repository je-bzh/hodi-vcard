/**
 * Image source picker
 *
 * Le popup cropper (popup-choice) propose deux sources d'image :
 *   1. Upload depuis le disque (file input)  ← géré par image-crop.js
 *   2. Recherche dans la banque Unsplash    ← géré ici
 *
 * Quand l'utilisateur choisit une vignette Unsplash :
 *   - On télécharge l'image en blob
 *   - On la convertit en data URL
 *   - On la passe au listener du file input via un Event synthétique
 *     → image-crop.js prend le relais comme si c'était un upload disque
 *
 * Clé API Unsplash : lue depuis VITE_UNSPLASH_ACCESS_KEY (à mettre dans .env).
 * Si absente : on désactive l'onglet Unsplash avec un message.
 */

import { t } from '/js/utils/i18n.js';

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API = 'https://api.unsplash.com/search/photos';

// ---------------------------------------------------------------------------
// Switch onglets upload / unsplash
// ---------------------------------------------------------------------------
$(document).on('click', '.js-source-tab', function (e) {
	e.preventDefault();
	const $tab = $(this);
	const source = $tab.data('source');

	$tab.siblings('.js-source-tab').removeClass('is-active');
	$tab.addClass('is-active');

	const $popup = $tab.closest('.popup');
	$popup.find('.image-source-pane').removeClass('is-active');
	$popup.find(`.image-source-pane[data-pane="${source}"]`).addClass('is-active');

	// Premier focus sur le search Unsplash quand on bascule dessus
	if (source === 'unsplash') {
		setTimeout(() => $popup.find('.js-unsplash-query').trigger('focus'), 50);
	}
});

// ---------------------------------------------------------------------------
// Recherche Unsplash (debounced)
// ---------------------------------------------------------------------------
let searchTimer = null;
$(document).on('input', '.js-unsplash-query', function () {
	const query = $(this).val().trim();
	const $results = $(this).closest('.image-source-pane').find('.js-unsplash-results');

	clearTimeout(searchTimer);
	if (!query) {
		$results.html(`<p class="image-source-empty">${t('source.prompt')}</p>`);
		return;
	}

	$results.html(`<p class="image-source-empty">${t('source.searching')}</p>`);

	searchTimer = setTimeout(async () => {
		try {
			const photos = await searchUnsplash(query);
			renderUnsplashResults($results, photos);
		} catch (err) {
			console.error('[image-source] Unsplash search error', err);
			$results.html(`<p class="image-source-empty image-source-error">${t("common.error", { message: err.message || err })}</p>`);
		}
	}, 400);
});

/**
 * Détecte l'orientation à demander à Unsplash en fonction du contexte de crop
 * en cours (lu depuis le DOM : quelle zone est en train d'être éditée).
 *
 * - wallpaper (.js-tile.is-active)         → portrait
 * - cover (.section__background.is-cropping-image) → landscape
 * - avatar (.section__avatar.is-cropping-image)    → squarish
 */
function detectOrientation() {
	if ($('.section__background.is-cropping-image').length) return 'landscape';
	if ($('.section__avatar.is-cropping-image').length) return 'squarish';
	if ($('.js-tile.is-active').length) return 'portrait';
	return 'portrait';
}

async function searchUnsplash(query) {
	if (!UNSPLASH_KEY) {
		throw new Error(t("source.no_key"));
	}
	const orientation = detectOrientation();
	const url = `${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=24&orientation=${orientation}`;
	const res = await fetch(url, {
		headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
	});
	if (!res.ok) {
		throw new Error(t("source.http_error", { status: res.status }));
	}
	const data = await res.json();
	return data.results || [];
}

function renderUnsplashResults($container, photos) {
	if (!photos.length) {
		$container.html(`<p class="image-source-empty">${t('source.no_results')}</p>`);
		return;
	}

	// Classe d'orientation sur la grille → CSS adapte l'aspect-ratio des cells
	const orientation = detectOrientation();
	const grid = $(`<div class="image-source-grid image-source-grid--${orientation}"></div>`);
	photos.forEach((photo) => {
		const thumb = photo.urls.thumb;
		const full = photo.urls.regular; // ~1080px wide, suffisant pour les crops
		const photographerName = photo.user?.name || 'Unsplash';
		const photographerLink = photo.user?.links?.html || 'https://unsplash.com';

		const $cell = $(`
			<button type="button" class="image-source-cell js-unsplash-pick"
				data-full="${escapeAttr(full)}"
				data-photographer="${escapeAttr(photographerName)}"
				data-photographer-link="${escapeAttr(photographerLink)}">
				<img src="${escapeAttr(thumb)}" alt="${escapeAttr(photo.alt_description || '')}" loading="lazy">
				<span class="image-source-cell__credit">${escapeText(photographerName)}</span>
			</button>
		`);
		grid.append($cell);
	});

	$container.empty().append(grid);
}

// ---------------------------------------------------------------------------
// Sélection d'une vignette Unsplash → injection dans le flow Croppie
// ---------------------------------------------------------------------------
$(document).on('click', '.js-unsplash-pick', async function (e) {
	e.preventDefault();
	const $cell = $(this);
	const fullUrl = $cell.attr('data-full');

	if (!fullUrl) return;

	// Indicateur visuel
	$cell.addClass('is-loading');
	$cell.siblings().css('opacity', 0.5).css('pointer-events', 'none');

	try {
		// 1. Télécharge l'image en blob
		const res = await fetch(fullUrl, { mode: 'cors' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const blob = await res.blob();

		// 2. Convertit en File (pour le passer au listener change du file input)
		const file = new File([blob], 'unsplash.jpg', { type: blob.type || 'image/jpeg' });

		// 3. Construit un FileList via DataTransfer, l'attache au file input,
		//    et déclenche un 'change' pour que image-crop.js prenne le relais
		const fileInput = document.getElementById('upload-image');
		if (!fileInput) throw new Error('File input introuvable');
		const dt = new DataTransfer();
		dt.items.add(file);
		fileInput.files = dt.files;
		fileInput.dispatchEvent(new Event('change', { bubbles: true }));
	} catch (err) {
		console.error('[image-source] download error', err);
		alert(t("source.fetch_error", { message: err.message || err }));
		$cell.removeClass('is-loading');
		$cell.siblings().css('opacity', '').css('pointer-events', '');
	}
});

// ---------------------------------------------------------------------------
// Reset à la fermeture du popup : reviens sur l'onglet "upload",
// vide les résultats, et désactive l'onglet Unsplash si pas de clé.
// ---------------------------------------------------------------------------
function resetSourcePicker() {
	$('.js-source-tab').removeClass('is-active');
	$('.js-source-tab[data-source="upload"]').addClass('is-active');
	$('.image-source-pane').removeClass('is-active');
	$('.image-source-pane[data-pane="upload"]').addClass('is-active');
	$('.js-unsplash-query').val('');
	$('.js-unsplash-results').html(`<p class="image-source-empty">${t('source.prompt')}</p>`);
}

// Quand on ouvre le popup, reset l'état
$(document).on('click', '.js-toggle-popup', function () {
	setTimeout(resetSourcePicker, 50);
});

// Désactive l'onglet Unsplash si la clé manque
$(function () {
	if (!UNSPLASH_KEY) {
		$('.js-source-tab[data-source="unsplash"]').each(function () {
			$(this).addClass('is-disabled').attr('title', 'Configurer VITE_UNSPLASH_ACCESS_KEY dans .env pour activer la banque d\'images');
		});
	}
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeAttr(s) {
	return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeText(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
	}[c]));
}
