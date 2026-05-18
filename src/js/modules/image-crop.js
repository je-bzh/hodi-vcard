/**
 * Image cropper (Croppie) + upload Supabase Storage
 *
 * Gère :
 *   - L'ouverture du popup #popup-choice selon le contexte (cover / avatar / wallpaper)
 *   - Le crop via Croppie avec viewport adapté à chaque contexte
 *   - En MODE EDIT (vCard existe + auth) : upload direct vers Storage + UPDATE vcards
 *   - En MODE CREATE (pas encore de vCard) : stockage du base64 en localStorage
 *     dans le payload pending, sera uploadé après l'OTP par vcard-form.js
 */

import { supabase } from '/js/utils/supabase.js';

const PENDING_KEY = 'hodi-vcard-pending';
const BUCKET = 'vcard-images';

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
		title: 'Nouvelle image de couverture',
		colName: 'cover_url',
		filename: 'cover',
	},
	avatar: {
		viewport: { width: 240, height: 240, type: 'circle' },
		boundary: { width: 400, height: 400 },
		output_size: { width: 480, height: 480 },
		title: 'Nouvelle photo de profil',
		colName: 'avatar_url',
		filename: 'avatar',
	},
	wallpaper: {
		viewport: { width: 200, height: 433, type: 'square' }, // ~9:19,5
		boundary: { width: 540, height: 500 },
		output_size: { width: 900, height: 1950 },
		title: 'Nouveau fond d’écran mobile',
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
			$closestPopup.find('.popup__head h4').text(config.title);

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
 * Convertit un data URL base64 en Blob.
 */
function dataUrlToBlob(dataUrl) {
	const [meta, b64] = dataUrl.split(',');
	const mime = (meta.match(/data:(.*?);/) || [null, 'image/png'])[1];
	const binary = atob(b64);
	const len = binary.length;
	const arr = new Uint8Array(len);
	for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
	return new Blob([arr], { type: mime });
}

/**
 * Upload une image (data URL) vers Supabase Storage et retourne l'URL publique.
 * Le path est `{user_id}/{filename}-{timestamp}.png` pour éviter le cache navigateur
 * quand on remplace une image.
 */
async function uploadToStorage(dataUrl, userId, filename) {
	const blob = dataUrlToBlob(dataUrl);
	const path = `${userId}/${filename}-${Date.now()}.png`;

	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(path, blob, {
			upsert: false,
			contentType: blob.type || 'image/png',
		});

	if (uploadError) {
		console.error('[image-crop] upload error', uploadError);
		throw uploadError;
	}

	const { data: { publicUrl } } = supabase.storage
		.from(BUCKET)
		.getPublicUrl(path);

	return publicUrl;
}

/**
 * Récupère la vcard courante du user authentifié (pour mode EDIT).
 * Retourne null si pas d'auth ou pas de vcard.
 */
async function getCurrentVcard() {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) return null;
	const { data } = await supabase
		.from('vcards')
		.select('id')
		.eq('user_id', session.user.id)
		.maybeSingle();
	return data ? { ...data, userId: session.user.id } : null;
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
		$btn.text('Enregistrement…').css('pointer-events', 'none').css('opacity', 0.7);

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
				// MODE EDIT : upload immédiat vers Storage + UPDATE vcard
				const publicUrl = await uploadToStorage(croppedDataUrl, vcard.userId, config.filename);
				const { error: updErr } = await supabase
					.from('vcards')
					.update({ [config.colName]: publicUrl })
					.eq('id', vcard.id);
				if (updErr) {
					console.error('[image-crop] update vcard error', updErr);
					alert(`Erreur sauvegarde : ${updErr.message}`);
				}
			} else if (config.colName) {
				// MODE CREATE : on garde le base64 pour upload post-OTP
				savePendingImage(currentCropContext, croppedDataUrl);
			}

			closePopup();
		} catch (err) {
			console.error('[image-crop] save error', err);
			alert(`Erreur : ${err.message || err}`);
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
