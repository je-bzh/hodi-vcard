/**
 * Comportement du logo Hodi vCard dans le header :
 *
 *   - Sur la home (body.body-home)  → le logo n'est pas cliquable
 *   - Sur toutes les autres pages   → le logo renvoie vers mes-infos.html
 *
 * Le partial header.html définit `href="mes-infos.html"` par défaut ;
 * sur la home on neutralise le clic + on retire le href pour que rien
 * ne se passe (et pour l'accessibilité : un <a> sans href ressemble à
 * du texte non interactif).
 */

$(function () {
	if ($('body').hasClass('body-home')) {
		const $logo = $('.js-logo-link');
		$logo.removeAttr('href').css({
			cursor: 'default',
			'pointer-events': 'none',
		});
	}
});
