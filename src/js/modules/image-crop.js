/**
 * Image cropper (Croppie) + upload via l'API (stockage local)
 *
 * Gère :
 *   - L'ouverture du popup #popup-choice selon le contexte (cover / avatar / wallpaper)
 *   - Le crop via Croppie avec viewport adapté à chaque contexte
 *   - En MODE EDIT (vCard existe + auth) : upload direct vers Storage + UPDATE vcards
 *   - En MODE CREATE (pas encore de vCard) : stockage du base64 en localStorage
 *     dans le payload pending, sera uploadé après l'OTP par vcard-form.js
 */

import { api } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';

const PENDING_KEY = 'hodi-vcard-pending';

let croppieContainer;
let currentCropContext = 'avatar'; // mémorise le type de crop en cours

/**
 * Configurations de crop par contexte.
 */
const CROP_CONFIGS = {
	cover: {
		viewport: { width: 480, height: 160, type: 'square' }, // 3:1
		boundary: { width: 540, height: 400 },
		output_size: { width: 1200, height: 400 },
		titleKey: 'cropper.title_cover',
		colName: 'cover_url',
		filename: 'cover',
	},
	avatar: {
		viewport: { width: 240, height: 240, type: 'circle' },
		boundary: { width: 400, height: 400 },
		output_size: { width: 480, height: 480 },
		titleKey: 'cropper.title_avatar',
		colName: 'avatar_url',
		filename: 'avatar',
	},
	wallpaper: {
		viewport: { width: 200, height: 433, type: 'square' }, // ~9:19,5
		boundary: { width: 540, height: 500 },
		output_size: { width: 900, height: 1950 },
		titleKey: 'cropper.title_wallpaper',
		colName: null, // géré séparément (table wallpapers)
		filename: 'wallpaper',
	},
};

function detectContext($trigger) {
	const $croping = $trigger.closest('.js-croping');
	if ($croping.hasClass('section__background')) return 'cover';
	if ($croping.hasClass('section__avatar')) return 'avatar';
	if ($trigger.closest('.js-tile').length) return 'wallpaper';
	return 'avatar';
}

function calculateRangeSliderLength(slider) {
	if (!slider) return;
	const { min, max, value } = slider;
	const pct = ((value - min) / (max - min)) * 100;
	slider.style.background = `linear-gradient(to right, white 0%, white ${pct}%, #ffffff4d ${pct}%, #ffffff4d 100%)`;
	slider.oninput = function () {
		const p = ((this.value - this.min) / (this.max - this.min)) * 100;
		this.style.background = `linear-gradient(to right, white 0%, white ${p}%, #ffffff4d ${p}%, #ffffff4d 100%)`;
	};
}

function uploadImageToCroppie() {
	if (!$('.image-cropper').length) return;
	const fileInput = document.getElementById('upload-image');
	if (!fileInput) return;

	fileInput.addEventListener('change', function (event) {
		const $closestPopup = $(this).closest('.popups');
		const reader = new FileReader();
		$closestPopup.find('.js-croppie').empty().append('<div id="croppie-container"></div>');

		setTimeout(() => {
			const config = CROP_CONFIGS[currentCropContext] || CROP_CONFIGS.avatar;
			$closestPopup.find('.popup__head h4').text(t(config.titleKey));

			croppieContainer = new Croppie(document.getElementById('croppie-container'), {
				viewport: config.viewport,
				boundary: config.boundary,
				enableResize: false,
				showZoomer: true,
			});

			reader.onload = function (e) {
				croppieContainer.bind({ url: e.target.result, zoom: 1 });
			};
			reader.readAsDataURL(event.target.files[0]);
			$closestPopup.addClass('init-cropper');

			setTimeout(() => {
				calculateRangeSliderLength(document.querySelector('.cr-slider'));
			}, 200);
		}, 300);
	});
}

/**
 * Upload une image (data URL) vers le back-end (stockage local) et retourne
 * l'URL publique. `kind` ∈ {avatar, cover, wallpaper}.
 */
async function uploadToStorage(dataUrl, kind) {
	const { url } = await api.upload(dataUrl, kind);
	return url;
}

/**
 * Récupère la vcard courante du user authentifié (pour mode EDIT).
 * Retourne null si pas d'auth ou pas de vcard.
 */
async function getCurrentVcard() {
	const user = await api.auth.session();
	if (!user) return null;
	return api.vcard.mine();
}

/**
 * Sauvegarde la base64 dans le pending localStorage pour upload différé (mode CREATE).
 */
function savePendingImage(context, dataUrl) {
	let pending = {};
	try {
		const raw = localStorage.getItem(PENDING_KEY);
		if (raw) pending = JSON.parse(raw);
	} catch {}
	if (context === 'cover') pending._pending_cover_data_url = dataUrl;
	else if (context === 'avatar') pending._pending_avatar_data_url = dataUrl;
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
	} catch (e) {
		console.error('[image-crop] localStorage too small ?', e);
	}
}

function closePopup() {
	$('.popups').removeClass('init-cropper is-visible');
	$('.js-croppie').empty();
	$('.is-cropping-image').removeClass('is-cropping-image');
	$('.js-tile').removeClass('is-active');
}

/**
 * Click "Enregistrer" : récupère le résultat Croppie et :
 *   - mode EDIT : upload Storage + UPDATE vcard
 *   - mode CREATE : stocke base64 dans pending localStorage
 */
function saveCroppedImageToTile() {
	if (!$('.image-cropper').length) return;
	const btn = document.getElementById('crop-button');
	if (!btn) return;

	btn.addEventListener('click', async function (e) {
		e.preventDefault();
		const config = CROP_CONFIGS[currentCropContext] || CROP_CONFIGS.avatar;
		const $btn = $(this);
		const originalLabel = $btn.text();
		$btn.text(t('common.saving')).css('pointer-events', 'none').css('opacity', 0.7);

		try {
			const croppedDataUrl = await croppieContainer.result({
				type: 'base64',
				size: config.output_size,
			});

			// MAJ visuelle immédiate du front (avatar OU cover)
			const $cropingActive = $('.is-cropping-image');
			if ($cropingActive.length) {
				$cropingActive.find('.js-image-to-edit')
					.attr('src', croppedDataUrl)
					.show();
				$cropingActive.find('.js-avatar-placeholder').hide();
			}
			// MAJ pour les tiles (wallpapers)
			$('.js-tile.is-active .js-crop-image').attr('src', croppedDataUrl);

			// Détermine si on est en mode EDIT ou CREATE
			const vcard = await getCurrentVcard();

			if (vcard && config.colName) {
				// MODE EDIT : upload immédiat + UPDATE vcard
				try {
					const publicUrl = await uploadToStorage(croppedDataUrl, config.filename);
					await api.vcard.update(vcard.id, { [config.colName]: publicUrl });
				} catch (updErr) {
					console.error('[image-crop] update vcard error', updErr);
					alert(t('common.error', { message: updErr.message }));
				}
			} else if (config.colName) {
				// MODE CREATE : on garde le base64 pour upload post-OTP
				savePendingImage(currentCropContext, croppedDataUrl);
			}

			closePopup();
		} catch (err) {
			console.error('[image-crop] save error', err);
			alert(t('common.error', { message: err.message || err }));
		} finally {
			$btn.text(originalLabel).css('pointer-events', '').css('opacity', '');
		}
	});
}

function zoomInOnImage() {
	if (!$('.image-cropper').length) return;
	const btn = document.getElementById('zoom-in-button');
	if (!btn) return;
	btn.addEventListener('click', function () {
		croppieContainer.setZoom(croppieContainer.get().zoom + 0.05);
		calculateRangeSliderLength(document.querySelector('.cr-slider'));
	});
}

function zoomOutOnImage() {
	if (!$('.image-cropper').length) return;
	const btn = document.getElementById('zoom-out-button');
	if (!btn) return;
	btn.addEventListener('click', function () {
		croppieContainer.setZoom(croppieContainer.get().zoom - 0.05);
		calculateRangeSliderLength(document.querySelector('.cr-slider'));
	});
}

/**
 * Click sur un bouton "edit" → ouvre le popup cropper et mémorise le contexte.
 */
// Event delegation : marche aussi pour les éléments créés dynamiquement
// (tuile "+ Ajouter" rendue par wallpapers.js après chargement).
$(document).on('click', '.js-toggle-popup', function (e) {
	e.preventDefault();
	const $trigger = $(this);

	// Bouton désactivé (mode CREATE pour wallpapers) → ne fait rien
	if ($trigger.hasClass('is-disabled') || $trigger.closest('.is-disabled').length) {
		return;
	}

	currentCropContext = detectContext($trigger);

	const $target = $($trigger.attr('href'));
	$target.toggleClass('is-visible');

	$trigger.closest('.js-tile').addClass('is-active');
	$trigger.closest('.js-croping').addClass('is-cropping-image');

	if (croppieContainer) {
		$('.popups').removeClass('init-cropper');
		$('.js-croppie').empty();
	}
});

uploadImageToCroppie();
saveCroppedImageToTile();
zoomInOnImage();
zoomOutOnImage();
