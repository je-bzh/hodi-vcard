/**
 * i18n minimaliste pour Hodi vCard
 *
 * Langue par défaut : détectée automatiquement (cf. detectInitialLang) —
 *   1. choix utilisateur persisté (localStorage 'hodi-vcard-lang'), sinon
 *   2. langue du navigateur (navigator.language), sinon
 *   3. fallback EN.
 * Override possible via le sélecteur du header.
 *
 * Usage HTML :
 *   <h2 data-i18n="hero.title">Default text</h2>
 *   <input data-i18n-placeholder="form.username_placeholder" placeholder="">
 *
 * Usage JS :
 *   import { t } from '/js/utils/i18n.js';
 *   showFeedback('info', t('feedback.create_info'));
 */

const STORAGE_KEY = 'hodi-vcard-lang';

const TRANSLATIONS = {
	en: {
		// --- Header ---
		'header.visit_hodi': 'Visit Hodi.host',
		'header.lang_label': 'Language',

		// --- Meta ---
		'meta.title': 'Hodi vCard – By Hodi, the unified African cloud',
		'meta.description': 'Your virtual business card, hosted on Hodi\'s pan-African cloud. Encrypted, secure, never used commercially.',

		// --- Footer ---
		'footer.logo_label': 'Hodi — Host different.',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'No paper',
		'hero.badge_no_card': 'No physical card',
		'hero.badge_no_app': 'No app',
		'hero.title_line1': 'Your virtual business card.',
		'hero.title_line2': 'Hosted in Africa.',
		'hero.cta': 'Create my Hodi vCard',
		'hero.retrieve_link': 'I already have a vCard — recover my access',
		'hero.pitch': 'Hodi offers you your virtual business card, hosted on its pan-African cloud.<br>Your data is encrypted, securely stored, and never used for commercial purposes.',

		// --- Retrieve popup ---
		'retrieve.title': 'Recover my Hodi vCard',
		'retrieve.intro': "Enter the email associated with your Hodi vCard. We'll send you a single-use link to access and edit it.",
		'retrieve.email_placeholder': 'your@email.com',
		'retrieve.send_btn': 'Send recovery link',

		// --- Tabs admin ---
		'tabs.my_info': 'My information',
		'tabs.my_wallpapers': 'My wallpapers',
		'tabs.my_signature': 'My email signature',

		// --- Form (mes-infos) ---
		'form.intro': "The data you enter here is only used to generate your vCard. It is stored securely, never used for commercial purposes, and the Hodi team has no access to it.",

		'form.username_label': 'Hodi vCard username',
		'form.username_placeholder': 'your-username',
		'form.check_btn': 'Check',
		'form.email_label': 'Email',
		'form.email_placeholder': 'your@email.com',
		'form.email_hint': 'This email is tied to your Hodi account and cannot be changed.',
		'form.first_name_label': 'First name',
		'form.last_name_label': 'Last name',
		'form.organization_label': 'Organization',
		'form.role_label': 'Role',

		'form.section_contact': 'Contact details',
		'form.mobile_label': 'Mobile',
		'form.whatsapp_checkbox': 'This number is also reachable on WhatsApp',
		'form.landline_label': 'Landline',
		'form.address_label': 'Address',
		'form.address_placeholder': 'Your postal address',
		'form.website_label': 'Website',
		'form.booking_label': 'Book an appointment',

		'form.section_socials': 'Social networks',

		'form.section_link': 'Custom link (optional)',
		'form.doc_label_label': 'Link label',
		'form.doc_label_placeholder': 'My portfolio, brochure, an article…',
		'form.doc_url_label': 'URL',
		'form.doc_url_placeholder': 'https://...',
		'form.doc_hint': 'A link you want to highlight on your vCard: portfolio, PDF brochure, article…',

		'form.save_create': 'Create my vCard',
		'form.save_update': 'Save my information',
		'form.delete': 'Delete my vCard permanently',

		'form.placeholder_empty': 'Not provided',

		// --- Slug check feedback ---
		'slug.empty': 'Type a username before checking.',
		'slug.too_short': 'Too short: minimum 3 characters.',
		'slug.checking': 'Checking…',
		'slug.available': '✓ "{slug}" is available!',
		'slug.taken': '✗ "{slug}" is already taken.',
		'slug.error': 'Error: {message}',

		// --- Feedback messages (JS) ---
		'feedback.no_vcard_yet': "You don't have a vCard yet. Fill in this form and click \"Create my vCard\" at the bottom.",
		'feedback.network_error': 'Network error. Check your connection and try again.',
		'feedback.no_vcard_to_delete': "You don't have a vCard to delete.",
		'feedback.deleted': 'vCard deleted. You can create a new one above.',
		'feedback.saved': '✓ Changes saved.<br>Public link: <a href="{url}">{url}</a>',
		'feedback.email_already_used': 'A vCard already exists for <strong>{email}</strong>. To edit it, click "Edit" at the bottom of that vCard.',
		'feedback.slug_taken': 'The username "{slug}" is already taken. Choose another one.',
		'feedback.create_email_sent': '<strong>✓ Confirmation email sent!</strong><br>A link has just been sent to <strong>{email}</strong>.<br>Click it to <strong>finalize the creation</strong> of your vCard.<br><br><span style="opacity: 0.7;">You can close this window — the link is valid for 1 hour.</span>',
		'feedback.finalizing': 'Finalizing the creation of your vCard…',
		'feedback.uploading_cover': 'Uploading cover…',
		'feedback.uploading_avatar': 'Uploading profile picture…',
		'feedback.created_redirecting': '✓ vCard created! Redirecting to your public card…',

		// --- Validation errors ---
		'error.first_name_required': 'First name is required.',
		'error.last_name_required': 'Last name is required.',
		'error.email_required': 'Email is required.',
		'error.email_invalid': 'The email is not valid.',
		'error.mobile_required': 'Mobile number is required.',
		'error.username_required': 'Hodi vCard username is required.',
		'error.username_invalid': 'Username can only contain lowercase letters, digits and hyphens.',
		'error.username_length': 'Username must be between 3 and 50 characters.',
		'error.email_missing_auth': 'Owner email is missing (auth issue).',

		// --- Modifier popup ---
		'modify.title': 'Want to edit your vCard?',
		'modify.subtitle': 'This vCard is yours and you want to update it?',
		'modify.description': "We'll send a unique edit link to the email associated with this vCard:",
		'modify.cta': 'Send me the edit link',
		'modify.close': 'Close',
		'modify.sending': 'Sending…',
		'modify.sent_title': '✓ Link sent',
		'modify.sent_description': 'An edit link has been sent to <strong>{email}</strong>.<br>It is valid for 1 hour. Check your inbox (and spam folder).',
		'modify.sent_footnote': 'You can close this window — when you click the link in your email, you will be signed in automatically.',
		'modify.error_no_email': "This vCard has no associated email.",
		'modify.error_network': 'A network error occurred. Check your connection and try again.',

		// --- Public vCard actions ---
		'public.visit_website': 'Visit my website',
		'public.book_appointment': 'Book an appointment',
		'public.save_contact': 'Save contact card',
		'public.edit': '> Edit',

		// --- Cropper popup ---
		'cropper.title_avatar': 'New profile photo',
		'cropper.title_cover': 'New cover image',
		'cropper.title_wallpaper': 'New mobile wallpaper',
		'cropper.drag_or': 'Drag your image here or…',
		'cropper.browse': 'Browse',
		'cropper.limit': 'Maximum 2 MB, JPG or PNG',
		'cropper.save': 'Save image',
		'cropper.new_image': 'New image',
		'cropper.source_computer': 'My computer',
		'cropper.source_library': 'Image library',
		'cropper.search_placeholder': 'Beach, forest, city, abstract…',
		'cropper.credit': 'Royalty-free photos — automatic photographer credit',

		// --- Common ---
		'common.retry': 'Try again',
		'common.saving': 'Saving…',
		'common.error': 'Error: {message}',
		'modify.error_title': "Couldn't send the link",

		// --- Public vCard (states + labels) ---
		'public.contact_landline': 'Landline',
		'public.contact_website': 'Website',
		'public.empty_title': 'No slug',
		'public.empty_body': 'This page expects a <code>?slug=xxx</code> parameter in the URL.',
		'public.back_home': '← Back to home',
		'public.notfound_title': '404 — vCard not found',
		'public.notfound_body': 'No vCard matches the slug <strong>{slug}</strong>.',
		'public.error_title': 'An error occurred',
		'public.vcf_error': 'Error generating the contact card. Please try again.',

		// --- Wallpapers (mes-fonds) ---
		'wallpapers.intro': 'Create and customize locked wallpapers for your smartphone:',
		'wallpapers.need_vcard': 'You must create your vCard first.',
		'wallpapers.add': 'Add',
		'wallpapers.download': 'Download',
		'wallpapers.delete': 'Delete',
		'wallpapers.delete_confirm': 'Delete this wallpaper?',
		'wallpapers.composing': 'Composing wallpaper…',
		'wallpapers.limit_reached': "You've reached the limit of {max} wallpapers.",
		'wallpapers.create_error': 'Error creating the wallpaper: {message}',
		'wallpapers.delete_error': 'Delete error: {message}',

		// --- Email signature ---
		'signature.intro': 'Embed your email signature with a link to your Hodi vCard:',
		'signature.copy_btn': "Copy my signature's HTML code",
		'signature.need_vcard': 'You must create your vCard first to generate an email signature.',
		'signature.add_contact': 'Add to my contacts',
		'signature.copied': '✓ Signature copied — paste it into your email client (HTML mode).',
		'signature.copied_btn': 'Copied ✓',
		'signature.copy_error': "Couldn't copy: {message}",

		// --- Image source (Unsplash) ---
		'source.prompt': 'Type a keyword to search royalty-free images on Unsplash.',
		'source.searching': 'Searching…',
		'source.no_results': 'No results. Try another keyword.',
		'source.fetch_error': "Couldn't fetch this image: {message}",
		'source.no_key': 'Image library not configured on the server.',
		'source.http_error': 'HTTP {status} — check your Unsplash API key.',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Please enter your email address.',
		'retrieve.checking': 'Checking…',
		'retrieve.none': 'No vCard is associated with <strong>{email}</strong>.<br>You can create one with the "Create my Hodi vCard" button on this page.',
		'retrieve.sent': "✓ A recovery link has just been sent to <strong>{email}</strong>.<br>Click the link in the email to access your vCard.",

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Available after creating your vCard.',
		'form.slug_locked_title': "The username can't be changed after creation.",
		'form.your_vcard_url': 'Your vCard URL:',
		'form.preview': 'Preview',
		'form.checking': 'Checking…',
		'form.sending_email': 'Sending email…',
		'form.email_sent_btn': 'Email sent ✓',
		'form.finalizing_btn': 'Finalizing…',
		'form.delete_confirm': 'Permanently delete the vCard "{slug}"?\n\nThis action is irreversible and breaks all existing links / QR codes.',
		'feedback.generating_wallpaper': 'Generating your Hodi wallpaper…',
		'feedback.create_conflict': 'Error: a vCard already exists for this email or username.',
	},

	fr: {
		// --- Header ---
		'header.visit_hodi': 'Visiter Hodi.host',
		'header.lang_label': 'Langue',

		// --- Meta ---
		'meta.title': 'Hodi vCard – By Hodi, le cloud unifié africain',
		'meta.description': 'Votre carte de visite virtuelle, hébergée sur le cloud panafricain de Hodi. Chiffrée, sécurisée, jamais exploitée commercialement.',

		// --- Footer ---
		'footer.logo_label': 'Hodi — Host different.',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'Pas de papier',
		'hero.badge_no_card': 'Pas de carte',
		'hero.badge_no_app': 'Pas d’appli',
		'hero.title_line1': 'Votre carte de visite virtuelle.',
		'hero.title_line2': 'Hébergée en Afrique.',
		'hero.cta': 'Créer ma vCard Hodi',
		'hero.retrieve_link': "J'ai déjà une vCard — retrouver mon accès",
		'hero.pitch': 'Hodi vous offre votre carte de visite virtuelle, hébergée sur son cloud panafricain.<br>Vos données sont chiffrées, stockées de manière sécurisée et ne sont pas exploitées commercialement.',

		// --- Retrieve popup ---
		'retrieve.title': 'Retrouver ma vCard Hodi',
		'retrieve.intro': "Saisissez l'email associé à votre vCard Hodi. Vous recevrez un lien à usage unique pour y accéder et la modifier.",
		'retrieve.email_placeholder': 'votre@email.com',
		'retrieve.send_btn': 'Envoyer le lien de récupération',

		// --- Tabs admin ---
		'tabs.my_info': 'Mes informations',
		'tabs.my_wallpapers': 'Mes fonds d’écran',
		'tabs.my_signature': 'Ma signature mail',

		// --- Form (mes-infos) ---
		'form.intro': "Les données saisies ici servent uniquement à générer votre vCard. Elles sont stockées de manière sécurisée, ne sont jamais exploitées à des fins commerciales, et l’équipe Hodi n’y a pas accès.",

		'form.username_label': 'Username Hodi vCard',
		'form.username_placeholder': 'votre-username',
		'form.check_btn': 'Vérifier',
		'form.email_label': 'Email',
		'form.email_placeholder': 'votre@email.com',
		'form.email_hint': 'Cet email correspond à votre compte Hodi et n’est pas modifiable.',
		'form.first_name_label': 'Prénom',
		'form.last_name_label': 'Nom',
		'form.organization_label': 'Organisme',
		'form.role_label': 'Fonction',

		'form.section_contact': 'Coordonnées',
		'form.mobile_label': 'Portable',
		'form.whatsapp_checkbox': 'Ce numéro est aussi joignable sur WhatsApp',
		'form.landline_label': 'Ligne fixe',
		'form.address_label': 'Adresse',
		'form.address_placeholder': 'Votre adresse postale',
		'form.website_label': 'Site web',
		'form.booking_label': 'Prise de rendez-vous',

		'form.section_socials': 'Réseaux sociaux',

		'form.section_link': 'Lien personnalisé (optionnel)',
		'form.doc_label_label': 'Intitulé du lien',
		'form.doc_label_placeholder': 'Mon portfolio, ma plaquette, un article…',
		'form.doc_url_label': 'URL',
		'form.doc_url_placeholder': 'https://...',
		'form.doc_hint': 'Un lien que vous voulez mettre en avant sur votre vCard : portfolio, plaquette PDF, article…',

		'form.save_create': 'Créer ma vCard',
		'form.save_update': 'Enregistrer mes informations',
		'form.delete': 'Supprimer ma vCard définitivement',

		'form.placeholder_empty': 'Non renseigné',

		// --- Slug check feedback ---
		'slug.empty': 'Saisissez un username avant de vérifier.',
		'slug.too_short': 'Trop court : minimum 3 caractères.',
		'slug.checking': 'Vérification…',
		'slug.available': '✓ « {slug} » est disponible !',
		'slug.taken': '✗ « {slug} » est déjà pris.',
		'slug.error': 'Erreur : {message}',

		// --- Feedback messages (JS) ---
		'feedback.no_vcard_yet': "Vous n’avez pas encore de vCard. Remplissez ce formulaire et cliquez sur « Créer ma vCard » en bas.",
		'feedback.network_error': 'Erreur réseau. Vérifiez votre connexion et réessayez.',
		'feedback.no_vcard_to_delete': "Vous n’avez pas de vCard à supprimer.",
		'feedback.deleted': 'vCard supprimée. Vous pouvez en créer une nouvelle ci-dessus.',
		'feedback.saved': '✓ Modifications enregistrées.<br>Lien public : <a href="{url}">{url}</a>',
		'feedback.email_already_used': 'Une vCard existe déjà pour <strong>{email}</strong>. Pour la modifier, cliquez sur « Modifier » en bas de cette vCard.',
		'feedback.slug_taken': 'Le username « {slug} » est déjà pris. Choisissez-en un autre.',
		'feedback.create_email_sent': '<strong>✓ Email de confirmation envoyé !</strong><br>Un lien vient d’être envoyé à <strong>{email}</strong>.<br>Cliquez dessus pour <strong>finaliser la création</strong> de votre vCard.<br><br><span style="opacity: 0.7;">Vous pouvez fermer cette fenêtre — le lien est valable 1 heure.</span>',
		'feedback.finalizing': 'Finalisation de la création de votre vCard…',
		'feedback.uploading_cover': 'Upload de la couverture…',
		'feedback.uploading_avatar': 'Upload de la photo de profil…',
		'feedback.created_redirecting': '✓ vCard créée ! Redirection vers votre carte publique…',

		// --- Validation errors ---
		'error.first_name_required': 'Le prénom est requis.',
		'error.last_name_required': 'Le nom est requis.',
		'error.email_required': 'L’email est requis.',
		'error.email_invalid': 'L’email n’est pas valide.',
		'error.mobile_required': 'Le numéro de portable est requis.',
		'error.username_required': 'Le username Hodi vCard est requis.',
		'error.username_invalid': 'Le username ne peut contenir que des lettres minuscules, chiffres et tirets.',
		'error.username_length': 'Le username doit faire entre 3 et 50 caractères.',
		'error.email_missing_auth': "L’email du propriétaire est manquant (problème d’auth).",

		// --- Modifier popup ---
		'modify.title': 'Vous souhaitez modifier votre vCard ?',
		'modify.subtitle': 'Cette vCard est la vôtre et vous souhaitez y apporter des modifications ?',
		'modify.description': 'Nous générons un lien unique de modification qui vous sera envoyé sur l’adresse email associée à cette vCard :',
		'modify.cta': 'Recevoir le lien unique de modification',
		'modify.close': 'Fermer',
		'modify.sending': 'Envoi en cours…',
		'modify.sent_title': '✓ Lien envoyé',
		'modify.sent_description': 'Un lien de modification a été envoyé à <strong>{email}</strong>.<br>Il est valable 1 heure. Vérifiez votre boîte mail (et les spams).',
		'modify.sent_footnote': 'Vous pouvez fermer cette fenêtre — en cliquant sur le lien reçu par email, vous serez connecté automatiquement.',
		'modify.error_no_email': "Cette vCard n’a pas d’email associé.",
		'modify.error_network': 'Une erreur réseau est survenue. Vérifiez votre connexion et réessayez.',

		// --- Public vCard actions ---
		'public.visit_website': 'Visiter mon site web',
		'public.book_appointment': 'Prendre rendez-vous',
		'public.save_contact': 'Sauvegarder la fiche contact',
		'public.edit': '> Modifier',

		// --- Cropper popup ---
		'cropper.title_avatar': 'Nouvelle photo de profil',
		'cropper.title_cover': 'Nouvelle image de couverture',
		'cropper.title_wallpaper': 'Nouveau fond d’écran mobile',
		'cropper.drag_or': 'Glissez votre image ici ou…',
		'cropper.browse': 'Parcourir',
		'cropper.limit': 'Maximum 2 Mo, fichier JPG ou PNG',
		'cropper.save': 'Enregistrer l’image',
		'cropper.new_image': 'Nouvelle image',
		'cropper.source_computer': 'Mon ordinateur',
		'cropper.source_library': 'Banque d’images',
		'cropper.search_placeholder': 'Plage, forêt, ville, abstrait…',
		'cropper.credit': 'Photos libres de droits — crédit photographe automatique',

		// --- Common ---
		'common.retry': 'Réessayer',
		'common.saving': 'Enregistrement…',
		'common.error': 'Erreur : {message}',
		'modify.error_title': 'Impossible d’envoyer le lien',

		// --- Public vCard (states + labels) ---
		'public.contact_landline': 'Ligne fixe',
		'public.contact_website': 'Site web',
		'public.empty_title': 'Pas de slug',
		'public.empty_body': 'Cette page attend un paramètre <code>?slug=xxx</code> dans l’URL.',
		'public.back_home': '← Retour à l’accueil',
		'public.notfound_title': '404 — vCard introuvable',
		'public.notfound_body': 'Aucune vCard ne correspond au slug <strong>{slug}</strong>.',
		'public.error_title': 'Une erreur est survenue',
		'public.vcf_error': 'Erreur lors de la génération de la fiche contact. Réessayez.',

		// --- Wallpapers (mes-fonds) ---
		'wallpapers.intro': 'Créez et personnalisez vos fonds d’écran verrouillés pour votre smartphone :',
		'wallpapers.need_vcard': 'Vous devez d’abord créer votre vCard.',
		'wallpapers.add': 'Ajouter',
		'wallpapers.download': 'Télécharger',
		'wallpapers.delete': 'Supprimer',
		'wallpapers.delete_confirm': 'Supprimer ce fond d’écran ?',
		'wallpapers.composing': 'Composition du fond d’écran…',
		'wallpapers.limit_reached': 'Vous avez atteint la limite de {max} fonds d’écran.',
		'wallpapers.create_error': 'Erreur lors de la création du fond : {message}',
		'wallpapers.delete_error': 'Erreur de suppression : {message}',

		// --- Email signature ---
		'signature.intro': 'Intégrez votre signature mail avec un lien vers votre vCard Hodi :',
		'signature.copy_btn': 'Copier le code HTML de ma signature',
		'signature.need_vcard': 'Vous devez d’abord créer votre vCard pour générer une signature mail.',
		'signature.add_contact': 'Ajouter à mes contacts',
		'signature.copied': '✓ Signature copiée — collez-la dans votre client mail (mode HTML).',
		'signature.copied_btn': 'Copié ✓',
		'signature.copy_error': 'Impossible de copier : {message}',

		// --- Image source (Unsplash) ---
		'source.prompt': 'Tapez un mot-clé pour rechercher des images libres de droits sur Unsplash.',
		'source.searching': 'Recherche…',
		'source.no_results': 'Aucun résultat. Essayez un autre mot-clé.',
		'source.fetch_error': 'Impossible de récupérer cette image : {message}',
		'source.no_key': 'Banque d’images non configurée côté serveur.',
		'source.http_error': 'HTTP {status} — vérifiez votre clé API Unsplash.',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Veuillez saisir votre adresse email.',
		'retrieve.checking': 'Vérification…',
		'retrieve.none': 'Aucune vCard n’est associée à <strong>{email}</strong>.<br>Vous pouvez en créer une depuis le bouton « Créer ma vCard Hodi » sur cette page.',
		'retrieve.sent': '✓ Un lien de récupération vient d’être envoyé à <strong>{email}</strong>.<br>Cliquez sur le lien dans l’email pour accéder à votre vCard.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Disponible après la création de votre vCard.',
		'form.slug_locked_title': 'Le slug ne peut pas être modifié après création.',
		'form.your_vcard_url': 'URL de votre vCard :',
		'form.preview': 'Aperçu',
		'form.checking': 'Vérification…',
		'form.sending_email': 'Envoi de l’email…',
		'form.email_sent_btn': 'Email envoyé ✓',
		'form.finalizing_btn': 'Finalisation…',
		'form.delete_confirm': 'Confirmer la suppression définitive de la vCard « {slug} » ?\n\nCette action est irréversible et casse tous les liens / QR codes existants.',
		'feedback.generating_wallpaper': 'Génération de votre fond d’écran Hodi…',
		'feedback.create_conflict': 'Erreur : une vCard existe déjà pour cet email ou ce username.',
	},
};

/**
 * Détermine la langue initiale : choix utilisateur ou langue navigateur, fallback EN.
 */
function detectInitialLang() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && TRANSLATIONS[saved]) return saved;
	} catch {}
	const nav = (navigator.language || 'en').toLowerCase();
	return nav.startsWith('fr') ? 'fr' : 'en';
}

let currentLang = detectInitialLang();

/**
 * Traduit une clé, remplace les paramètres entre {accolades}.
 */
export function t(key, params) {
	let text = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
	if (params) {
		for (const [p, v] of Object.entries(params)) {
			text = text.split(`{${p}}`).join(v);
		}
	}
	return text;
}

/**
 * Change la langue, persiste, ré-applique les traductions, et notifie les modules
 * pour qu'ils re-rendent leur état dynamique.
 */
export function setLang(lang) {
	if (!TRANSLATIONS[lang]) return;
	currentLang = lang;
	try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
	document.documentElement.setAttribute('lang', lang);
	applyTranslations();
	$(document).trigger('lang:changed', [lang]);
}

export function getLang() {
	return currentLang;
}

/**
 * Parcourt le DOM, applique les traductions sur les éléments marqués
 * data-i18n / data-i18n-html / data-i18n-placeholder / data-i18n-aria-label.
 */
export function applyTranslations() {
	document.querySelectorAll('[data-i18n]').forEach(el => {
		el.textContent = t(el.getAttribute('data-i18n'));
	});
	document.querySelectorAll('[data-i18n-html]').forEach(el => {
		el.innerHTML = t(el.getAttribute('data-i18n-html'));
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
	});
	document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
		el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
	});
	document.querySelectorAll('[data-i18n-title]').forEach(el => {
		el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
	});
	// data-i18n-content : pour <meta content="..."> (description, og:title, etc.)
	document.querySelectorAll('[data-i18n-content]').forEach(el => {
		el.setAttribute('content', t(el.getAttribute('data-i18n-content')));
	});
}

// Au chargement du DOM, applique les traductions et set la lang sur <html>
$(function () {
	document.documentElement.setAttribute('lang', currentLang);
	applyTranslations();
});
