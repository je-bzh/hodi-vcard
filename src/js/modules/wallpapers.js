/**
 * Wallpapers QR (my-wallpapers)
 *
 * Au chargement :
 *   - Vérifie qu'on a un user auth ET une vcard (sinon redirect vers ma-vcard)
 *   - Charge la liste des wallpapers depuis la table `wallpapers`
 *   - Rend les tuiles (max 6) + la tuile "+ Ajouter" si on est sous la limite
 *
 * Workflow création :
 *   - Click sur "+ Ajouter" → ouvre le popup cropper (image-crop.js)
 *   - Le crop est récupéré au output_size wallpaper (900×1950)
 *   - On compose : le bg + le QR code (avec bordure blanche) au bas centré
 *   - Upload du résultat composé sur Storage `vcard-images/{userId}/wallpaper-{ts}.png`
 *   - INSERT dans `wallpapers` (avec storage_path pour pouvoir supprimer le fichier)
 *
 * Workflow suppression :
 *   - Click sur la corbeille de la tuile → DELETE row + DELETE Storage object
 *
 * Workflow download :
 *   - Click sur l'image → ouvre le fichier dans un nouvel onglet (download natif)
 *
 * Activé uniquement sur la page qui a data-page="my-wallpapers".
 */

import { api, boot } from '/js/utils/api.js';
import { t } from '/js/utils/i18n.js';
import { buildVcardUrl, assetUrl } from '/js/utils/urls.js';
import QRCode from 'qrcode';

const MAX_WALLPAPERS = 3; // 1 défaut Hodi + 2 perso

let currentVcard = null;
// Première liste de wallpapers fournie par le serveur (page.php) → 0 appel API au load.
let bootWalls = boot && boot.wallpapers ? boot.wallpapers : null;

if ($('html').attr('data-page') === 'my-wallpapers') {
	bootstrap();
}

async function bootstrap() {
	let vcard = null;
	try {
		const user = boot ? boot.user : await api.auth.session();
		if (!user) return; // auth-guard.js gère la redirection
		vcard = boot ? boot.vcard : await api.vcard.mine();
	} catch (err) {
		console.error('[wallpapers] bootstrap error', err);
	}

	if (!vcard) {
		showEmptyVcardState();
		return;
	}
	currentVcard = vcard;

	await loadAndRender();
	bindCreateButton();
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
async function loadAndRender() {
	let walls = [];
	if (bootWalls) {
		walls = bootWalls;
		bootWalls = null; // une seule fois ; les rechargements (ajout/suppr) refetchent
	} else {
		try {
			walls = await api.wallpapers.list();
		} catch (error) {
			console.error('[wallpapers] list error', error);
			return;
		}
	}

	// Si pas de wallpaper par défaut Hodi → on le crée (résilience pour les
	// vcards existantes ou si la création initiale a raté)
	const hasDefault = walls.some((w) => w.is_default);
	if (!hasDefault) {
		const created = await createDefaultHodiWallpaper();
		if (created) {
			walls = [created, ...walls];
		}
	}

	const $grid = $('.tiles-images .grid-flex');
	$grid.empty();

	walls.forEach((w) => $grid.append(renderTile(w)));

	// Tuiles "+ Ajouter" vides pour les slots libres (limite à 4 total → 3 perso)
	const slotsLeft = Math.max(0, MAX_WALLPAPERS - walls.length);
	for (let i = 0; i < slotsLeft; i++) {
		$grid.append(renderAddTile());
	}

	bindTileActions();
}

function renderTile(wallpaper) {
	const shortId = wallpaper.id.slice(0, 8);
	const isDefault = wallpaper.is_default;
	// Le wallpaper par défaut n'a pas de bouton suppression — il est verrouillé.
	const deleteButton = isDefault ? '' : `
		<li>
			<a href="#" class="js-delete-wallpaper" aria-label="${t('wallpapers.delete')}">
				<img src="${assetUrl('public/assets/images/svg/ico-remove-1.svg')}" alt="${t('wallpapers.delete')}">
			</a>
		</li>`;
	return `
		<div class="grid__col grid__col--1of3">
			<div class="tile-image ${isDefault ? 'tile-image--locked' : ''}" data-wallpaper-id="${wallpaper.id}" data-storage-path="${escapeAttr(wallpaper.storage_path)}">
				<img src="${escapeAttr(wallpaper.image_url)}" alt="Wallpaper" class="js-crop-image">
				<ul class="tile__actions">
					<li>
						<a href="${escapeAttr(wallpaper.image_url)}" download="hodi-wallpaper-${shortId}.png" target="_blank" rel="noopener" aria-label="${t('wallpapers.download')}">
							<img src="${assetUrl('public/assets/images/svg/ico-upload-1.svg')}" alt="${t('wallpapers.download')}">
						</a>
					</li>
					${deleteButton}
				</ul>
			</div>
		</div>
	`;
}

function renderAddTile() {
	// L'img.js-crop-image est invisible mais nécessaire : image-crop.js y pose le
	// data URL après le crop ; on l'observe via MutationObserver pour composer+upload.
	return `
		<div class="grid__col grid__col--1of3">
			<div class="tile-image js-tile js-add-wallpaper">
				<img src="" alt="" class="js-crop-image" style="display:none;">
				<a href="#popup-choice" class="js-toggle-popup tile__overlay">
					<img src="${assetUrl('public/assets/images/svg/ico-tile.svg')}" alt="">
					<h6>${t('wallpapers.add')}</h6>
				</a>
			</div>
		</div>
	`;
}

function showEmptyVcardState() {
	$('.tiles-images').html(`
		<div style="text-align:center; padding:4rem 2rem; color: var(--c-white);">
			<p style="margin-bottom: 1.6rem;">${t('wallpapers.need_vcard')}</p>
			<a href="my-info" class="btn btn--aqua">${t('form.save_create')}</a>
		</div>
	`);
	$('.section__actions').hide();
}

// ---------------------------------------------------------------------------
// Création d'un wallpaper (composition canvas → upload)
// ---------------------------------------------------------------------------

/**
 * Compose une image wallpaper (bg) avec le QR code centré-bas, encadré d'une
 * bordure blanche arrondie. Renvoie un data URL PNG.
 */
/**
 * Compose le fond d'écran Hodi par défaut puis ajoute le QR par-dessus.
 *
 * Le bg est chargé depuis /public/assets/images/wallpaper-hodi-bg.png si le
 * fichier existe (PNG officiel fourni par le client). En fallback, on génère
 * un bg de secours (gradient + texte HODI) directement en canvas pour que la
 * feature continue de fonctionner même sans le PNG.
 */
async function composeDefaultHodiWallpaper(qrUrl) {
	const W = 900;
	const H = 1950;

	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');

	// 1. Tente de charger le PNG officiel Hodi (priorité)
	// On passe par assetUrl() qui gère le préfixe base /vcard/ en prod et
	// strippe automatiquement le préfixe public/ (cf. utils/urls.js).
	let bgLoaded = false;
	try {
		const bg = await loadImage(assetUrl('public/assets/images/wallpaper-hodi-bg.png'));
		// Crop "cover" si ratios différents
		const bgRatio = bg.naturalWidth / bg.naturalHeight;
		const canvasRatio = W / H;
		let dw, dh, dx, dy;
		if (bgRatio > canvasRatio) {
			dh = H;
			dw = H * bgRatio;
			dx = (W - dw) / 2;
			dy = 0;
		} else {
			dw = W;
			dh = W / bgRatio;
			dx = 0;
			dy = (H - dh) / 2;
		}
		ctx.drawImage(bg, dx, dy, dw, dh);
		bgLoaded = true;
	} catch (e) {
		// PNG pas dispo → fallback canvas
	}

	if (!bgLoaded) {
		// Fallback : gradient violet + texte HODI dessiné en canvas (basique)
		const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
		bgGrad.addColorStop(0, '#5C2A6E');
		bgGrad.addColorStop(0.5, '#3A1F50');
		bgGrad.addColorStop(1, '#1A1A45');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, W, H);

		const hodiText = 'HODI';
		ctx.font = `900 180px "Helvetica Neue", Helvetica, Arial, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const hodiY = H * 0.78;
		const hodiWidth = ctx.measureText(hodiText).width;
		const hodiGrad = ctx.createLinearGradient(W / 2 - hodiWidth / 2, 0, W / 2 + hodiWidth / 2, 0);
		hodiGrad.addColorStop(0, '#3EABE1');
		hodiGrad.addColorStop(0.25, '#5157A2');
		hodiGrad.addColorStop(0.5, '#784C99');
		hodiGrad.addColorStop(0.75, '#C54B95');
		hodiGrad.addColorStop(1, '#EF7747');
		ctx.fillStyle = hodiGrad;
		ctx.fillText(hodiText, W / 2, hodiY);

		ctx.fillStyle = '#FFFFFF';
		ctx.font = '500 44px "Helvetica Neue", Helvetica, Arial, sans-serif';
		ctx.fillText('The unified African cloud', W / 2, hodiY + 130);

		ctx.fillStyle = 'rgba(255,255,255,0.85)';
		ctx.font = '500 30px "Helvetica Neue", Helvetica, Arial, sans-serif';
		ctx.fillText('hodi.host', W / 2, hodiY + 200);
	}

	// 2. Charger le QR + dessiner la carte blanche centrée verticalement
	const qrDataUrl = await QRCode.toDataURL(qrUrl, {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 400,
		color: { dark: '#000000', light: '#FFFFFF' },
	});
	const qrImg = await loadImage(qrDataUrl);

	const qrSize = 322;
	const cardPad = 26;
	const cardSize = qrSize + cardPad * 2;
	const cardX = (W - cardSize) / 2;
	const cardY = (H - cardSize) / 2; // centré verticalement (même position que les wallpapers perso)
	const radius = 36;

	drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, radius);
	ctx.fillStyle = '#FFFFFF';
	ctx.shadowColor = 'rgba(0,0,0,0.35)';
	ctx.shadowBlur = 30;
	ctx.shadowOffsetY = 8;
	ctx.fill();
	ctx.shadowColor = 'transparent';
	ctx.shadowBlur = 0;
	ctx.shadowOffsetY = 0;

	ctx.drawImage(qrImg, cardX + cardPad, cardY + cardPad, qrSize, qrSize);

	return canvas.toDataURL('image/png', 0.92);
}

/**
 * Crée le wallpaper Hodi par défaut pour une vcard (compose + upload + INSERT).
 * Exportable : utilisable aussi depuis vcard-form.js à la création de la vcard.
 * Renvoie la row insérée, ou null si erreur (best-effort, ne bloque pas).
 */
export async function createDefaultHodiWallpaperFor({ slug }) {
	try {
		const qrUrl = buildVcardUrl(slug);
		const dataUrl = await composeDefaultHodiWallpaper(qrUrl);
		const { url, path } = await api.upload(dataUrl, 'wallpaper');
		return await api.wallpapers.create({
			image_url: url,
			storage_path: path,
			is_default: true,
		});
	} catch (err) {
		console.error('[wallpapers] createDefaultHodiWallpaperFor error', err);
		return null;
	}
}

/**
 * Wrapper interne pour le bootstrap mes-fonds.
 */
async function createDefaultHodiWallpaper() {
	return createDefaultHodiWallpaperFor({ slug: currentVcard.slug });
}

async function composeWallpaper(bgDataUrl, qrUrl) {
	const W = 900;
	const H = 1950;

	const bgImg = await loadImage(bgDataUrl);
	const qrDataUrl = await QRCode.toDataURL(qrUrl, {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 400,
		color: { dark: '#000000', light: '#FFFFFF' },
	});
	const qrImg = await loadImage(qrDataUrl);

	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');

	// 1. Dessine le bg
	ctx.drawImage(bgImg, 0, 0, W, H);

	// 2. Carte blanche arrondie pour le QR (style "wallet card")
	//    Taille réduite de 30% (qrSize 460 → 322), carte centrée verticalement.
	const qrSize = 322;
	const cardPad = 26;
	const cardSize = qrSize + cardPad * 2;
	const cardX = (W - cardSize) / 2;
	const cardY = (H - cardSize) / 2; // centré verticalement dans l'écran
	const radius = 36;

	drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, radius);
	ctx.fillStyle = '#FFFFFF';
	ctx.shadowColor = 'rgba(0,0,0,0.25)';
	ctx.shadowBlur = 30;
	ctx.shadowOffsetY = 8;
	ctx.fill();
	ctx.shadowColor = 'transparent';
	ctx.shadowBlur = 0;
	ctx.shadowOffsetY = 0;

	// 3. Le QR dans la carte
	ctx.drawImage(qrImg, cardX + cardPad, cardY + cardPad, qrSize, qrSize);

	return canvas.toDataURL('image/png', 0.92);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

async function uploadComposedWallpaper(dataUrl) {
	const { url, path } = await api.upload(dataUrl, 'wallpaper');
	return { publicUrl: url, path };
}

// ---------------------------------------------------------------------------
// Hook sur image-crop.js : intercepte la sauvegarde d'un crop wallpaper
// ---------------------------------------------------------------------------
/**
 * Quand l'utilisateur valide le crop wallpaper, image-crop.js update visuellement
 * la tuile active (.js-tile.is-active .js-crop-image). On écoute cet event via
 * MutationObserver pour compose+upload juste après.
 *
 * Approche alternative : exposer une callback. Mais on garde image-crop.js générique.
 */
function bindCropResultHook() {
	// On hook après que le crop a mis à jour l'image dans la tuile active.
	// image-crop.js fait : $('.js-tile.is-active .js-crop-image').attr('src', croppedDataUrl)
	// On observe les mutations d'attr src sur les tuiles wallpapers.

	// Plus simple : on intercepte le click sur le bouton #crop-button avant qu'image-crop.js
	// ne ferme le popup. On lit la valeur du crop directement via croppieContainer global.
	// Mais croppieContainer n'est pas exposé.

	// On opte pour : observer la grille pour détecter quand une nouvelle src
	// est posée sur .js-crop-image dans la tuile add-wallpaper active.
	const $grid = $('.tiles-images .grid-flex');
	if (!$grid.length) return;

	const observer = new MutationObserver(async (mutations) => {
		for (const m of mutations) {
			if (m.type !== 'attributes' || m.attributeName !== 'src') continue;
			const $img = $(m.target);
			if (!$img.hasClass('js-crop-image')) continue;
			const $tile = $img.closest('.js-add-wallpaper');
			if (!$tile.length) continue;

			const dataUrl = $img.attr('src');
			if (!dataUrl || !dataUrl.startsWith('data:image')) continue;

			// On reset l'observer pendant la composition pour éviter les boucles
			observer.disconnect();
			await handleNewWallpaper(dataUrl);
			// Réobserve après reload
		}
	});

	observer.observe($grid[0], {
		subtree: true,
		attributes: true,
		attributeFilter: ['src'],
	});
}

async function handleNewWallpaper(croppedBgDataUrl) {
	try {
		showProcessing(true);
		const qrUrl = buildVcardUrl(currentVcard.slug);
		const composedDataUrl = await composeWallpaper(croppedBgDataUrl, qrUrl);
		const { publicUrl, path } = await uploadComposedWallpaper(composedDataUrl);

		try {
			await api.wallpapers.create({
				image_url: publicUrl,
				storage_path: path,
			});
		} catch (insertErr) {
			if (insertErr.message && insertErr.message.includes('WALLPAPERS_LIMIT')) {
				alert(t('wallpapers.limit_reached', { max: MAX_WALLPAPERS }));
			} else {
				console.error('[wallpapers] create error', insertErr);
				alert(t('common.error', { message: insertErr.message }));
			}
			return;
		}

		await loadAndRender();
		// Re-bind l'observer sur la nouvelle grille
		bindCropResultHook();
	} catch (err) {
		console.error('[wallpapers] handleNewWallpaper error', err);
		alert(t('wallpapers.create_error', { message: err.message || err }));
	} finally {
		showProcessing(false);
	}
}

function showProcessing(on) {
	if (on) {
		if (!$('.wallpaper-processing').length) {
			$('body').append('<div class="wallpaper-processing" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.8rem;">' + t('wallpapers.composing') + '</div>');
		}
	} else {
		$('.wallpaper-processing').remove();
	}
}

// ---------------------------------------------------------------------------
// Actions sur les tuiles existantes
// ---------------------------------------------------------------------------
function bindTileActions() {
	$('.js-delete-wallpaper').off('click').on('click', async function (e) {
		e.preventDefault();
		const $tile = $(this).closest('.tile-image');
		const wallpaperId = $tile.attr('data-wallpaper-id');

		if (!confirm(t('wallpapers.delete_confirm'))) return;

		// Le serveur supprime la row ET le fichier de stockage associé.
		try {
			await api.wallpapers.remove(wallpaperId);
		} catch (dbErr) {
			alert(t('wallpapers.delete_error', { message: dbErr.message }));
			return;
		}

		await loadAndRender();
		bindCropResultHook();
	});
}

function bindCreateButton() {
	// La tuile "+ Ajouter" ouvre le popup cropper (déjà géré par image-crop.js
	// via .js-toggle-popup). Le bouton du bas fait pareil.
	$('.section__actions .btn').off('click').on('click', function (e) {
		e.preventDefault();
		$('.js-add-wallpaper .js-toggle-popup').trigger('click');
	});

	bindCropResultHook();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeAttr(s) {
	return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
