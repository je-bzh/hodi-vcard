/**
 * i18n minimaliste pour Hodi vCard
 *
 * Langue par défaut : détectée automatiquement (cf. detectInitialLang) —
 *   1. choix utilisateur persisté (localStorage, puis cookie 'hodi-vcard-lang'), sinon
 *   2. langue du navigateur (navigator.language), sinon
 *   3. fallback EN.
 * Override possible via le sélecteur du header. Le choix est aussi écrit dans un
 * cookie lisible par le serveur (SSR + langue des emails/erreurs).
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
		'meta.title': 'Hodi vCard - By Hodi, the unified African cloud',
		'meta.description': 'Your virtual business card, made in Africa. Encrypted, secure, never used commercially.',

		// --- Footer ---
		'footer.logo_label': 'Hodi - Host different.',
		'footer.legal': 'Legal notice',
		'footer.privacy': 'Privacy policy',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'No paper',
		'hero.badge_no_card': 'No physical card',
		'hero.badge_no_app': 'No app',
		'hero.title_line1': 'The digital business card.',
		'hero.title_line2': 'Free.',
		'hero.cta': 'I create my Hodi vCard',
		'hero.retrieve_link': 'I already have a vCard, recover my access',
		'hero.pitch':
			'Hodi offers you your personal virtual business card.<br>Your data is securely stored and never used for commercial purposes.',

		// --- Retrieve popup ---
		'retrieve.title': 'Recover my Hodi vCard',
		'retrieve.intro':
			"Enter the email associated with your Hodi vCard. We'll send you an access link to view and edit it.",
		'retrieve.email_placeholder': 'your@email.com',
		'retrieve.send_btn': 'Send recovery link',

		// --- Tabs admin ---
		'tabs.my_info': 'My information',
		'tabs.my_wallpapers': 'My wallpapers',
		'tabs.my_signature': 'My email signature',

		// --- Form (mes-infos) ---
		'form.intro':
			'The data you enter here is only used to generate your vCard. It is stored securely and will never be used for commercial purposes.',

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
		'feedback.no_vcard_yet':
			'You don\'t have a vCard yet. Fill in this form and click "Create my vCard" at the bottom.',
		'feedback.network_error': 'Network error. Check your connection and try again.',
		'feedback.no_vcard_to_delete': "You don't have a vCard to delete.",
		'feedback.deleted': 'vCard deleted. You can create a new one above.',
		'feedback.saved': '✓ Changes saved.<br>Public link: <a href="{url}">{url}</a>',
		'feedback.email_already_used':
			'A vCard already exists for <strong>{email}</strong>. To edit it, click "Edit" at the bottom of that vCard.',
		'feedback.slug_taken': 'The username "{slug}" is already taken. Choose another one.',
		'feedback.create_email_sent':
			'<strong>✓ Confirmation email sent!</strong><br>A link has just been sent to <strong>{email}</strong>.<br>Click it to <strong>finalize the creation</strong> of your vCard.<br><br><span style="opacity: 0.7;">You can close this window. The link is valid for 4 hours.</span>',
		'feedback.finalizing': 'Finalizing the creation of your vCard…',
		'feedback.uploading_cover': 'Uploading cover…',
		'feedback.uploading_avatar': 'Uploading profile picture…',
		'feedback.created_redirecting': '✓ vCard created! Redirecting to your public card…',
		'feedback.created_done_title': 'Your vCard is created!',
		'feedback.created_done_hint': 'You can keep editing your information here, or:',
		'feedback.created_view_public': 'View my public vCard',
		'feedback.created_go_wallpapers': 'Create my wallpapers →',

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
		'modify.description': "We'll send an edit link to the email associated with this vCard:",
		'modify.cta': 'Send me the edit link',
		'modify.close': 'Close',
		'modify.sending': 'Sending…',
		'modify.sent_title': '✓ Link sent',
		'modify.sent_description':
			'An edit link has been sent to <strong>{email}</strong>.<br>It is valid for 4 hours. Check your inbox (and spam folder).',
		'modify.sent_footnote':
			'You can close this window. When you click the link in your email, you will be signed in automatically.',
		'modify.error_no_email': 'This vCard has no associated email.',
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
		'cropper.credit': 'Royalty-free photos, automatic photographer credit',

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
		'public.notfound_title': '404 - vCard not found',
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
		'signature.download_btn': 'Download as HTML file',
		'signature.downloaded': '✓ HTML file downloaded.',
		'signature.need_vcard': 'You must create your vCard first to generate an email signature.',
		'signature.add_contact': 'Add to my contacts',
		'signature.copied': '✓ Signature copied. Paste it into your email client (HTML mode).',
		'signature.copied_btn': 'Copied ✓',
		'signature.copy_error': "Couldn't copy: {message}",

		// --- Image source (Unsplash) ---
		'source.prompt': 'Type a keyword to search royalty-free images on Unsplash.',
		'source.searching': 'Searching…',
		'source.no_results': 'No results. Try another keyword.',
		'source.fetch_error': "Couldn't fetch this image: {message}",

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Please enter your email address.',
		'retrieve.checking': 'Checking…',
		'retrieve.none':
			'No vCard is associated with <strong>{email}</strong>.<br>You can create one with the "Create my Hodi vCard" button on this page.',
		'retrieve.sent':
			'✓ A recovery link has just been sent to <strong>{email}</strong>.<br>Click the link in the email to access your vCard.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Available after creating your vCard.',
		'form.slug_locked_title': "The username can't be changed after creation.",
		'form.your_vcard_url': 'Your vCard URL:',
		'form.preview': 'Preview',
		'form.checking': 'Checking…',
		'form.sending_email': 'Sending email…',
		'form.email_sent_btn': 'Email sent ✓',
		'form.finalizing_btn': 'Finalizing…',
		'form.delete_confirm':
			'Permanently delete the vCard "{slug}"?\n\nThis action is irreversible and breaks all existing links / QR codes.',
		'feedback.generating_wallpaper': 'Generating your Hodi wallpaper…',
		'feedback.create_conflict': 'Error: a vCard already exists for this email or username.',
	},

	fr: {
		// --- Header ---
		'header.visit_hodi': 'Visiter Hodi.host',
		'header.lang_label': 'Langue',

		// --- Meta ---
		'meta.title': 'Hodi vCard - By Hodi, le cloud unifié africain',
		'meta.description':
			'Votre carte de visite virtuelle, conçue en Afrique. Chiffrée, sécurisée, jamais exploitée commercialement.',

		// --- Footer ---
		'footer.logo_label': 'Hodi - Host different.',
		'footer.legal': 'Mentions légales',
		'footer.privacy': 'Politique de confidentialité',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'Pas de papier',
		'hero.badge_no_card': 'Pas de carte',
		'hero.badge_no_app': 'Pas d’appli',
		'hero.title_line1': 'La carte de visite digitale.',
		'hero.title_line2': 'Gratuite.',
		'hero.cta': 'Je crée ma vCard Hodi',
		'hero.retrieve_link': "J'ai déjà une vCard, retrouver mon accès",
		'hero.pitch':
			'Hodi vous offre votre carte de visite virtuelle et personnelle.<br>Vos données sont stockées de manière sécurisée et ne sont pas exploitées commercialement.',

		// --- Retrieve popup ---
		'retrieve.title': 'Retrouver ma vCard Hodi',
		'retrieve.intro':
			"Saisissez l'email associé à votre vCard Hodi. Vous recevrez un lien d'accès pour la consulter et la modifier.",
		'retrieve.email_placeholder': 'votre@email.com',
		'retrieve.send_btn': 'Envoyer le lien de récupération',

		// --- Tabs admin ---
		'tabs.my_info': 'Mes informations',
		'tabs.my_wallpapers': 'Mes fonds d’écran',
		'tabs.my_signature': 'Ma signature mail',

		// --- Form (mes-infos) ---
		'form.intro':
			'Les données saisies ici servent uniquement à générer votre vCard. Elles sont stockées de manière sécurisée et ne seront jamais exploitées à des fins commerciales.',

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
		'feedback.no_vcard_yet':
			'Vous n’avez pas encore de vCard. Remplissez ce formulaire et cliquez sur « Créer ma vCard » en bas.',
		'feedback.network_error': 'Erreur réseau. Vérifiez votre connexion et réessayez.',
		'feedback.no_vcard_to_delete': 'Vous n’avez pas de vCard à supprimer.',
		'feedback.deleted': 'vCard supprimée. Vous pouvez en créer une nouvelle ci-dessus.',
		'feedback.saved': '✓ Modifications enregistrées.<br>Lien public : <a href="{url}">{url}</a>',
		'feedback.email_already_used':
			'Une vCard existe déjà pour <strong>{email}</strong>. Pour la modifier, cliquez sur « Modifier » en bas de cette vCard.',
		'feedback.slug_taken': 'Le username « {slug} » est déjà pris. Choisissez-en un autre.',
		'feedback.create_email_sent':
			'<strong>✓ Email de confirmation envoyé !</strong><br>Un lien vient d’être envoyé à <strong>{email}</strong>.<br>Cliquez dessus pour <strong>finaliser la création</strong> de votre vCard.<br><br><span style="opacity: 0.7;">Vous pouvez fermer cette fenêtre. Le lien est valable 4 heures.</span>',
		'feedback.finalizing': 'Finalisation de la création de votre vCard…',
		'feedback.uploading_cover': 'Upload de la couverture…',
		'feedback.uploading_avatar': 'Upload de la photo de profil…',
		'feedback.created_redirecting': '✓ vCard créée ! Redirection vers votre carte publique…',
		'feedback.created_done_title': 'Votre vCard est créée !',
		'feedback.created_done_hint': 'Vous pouvez continuer à éditer vos informations ici, ou :',
		'feedback.created_view_public': 'Voir ma vCard publique',
		'feedback.created_go_wallpapers': 'Créer mes fonds d’écran →',

		// --- Validation errors ---
		'error.first_name_required': 'Le prénom est requis.',
		'error.last_name_required': 'Le nom est requis.',
		'error.email_required': 'L’email est requis.',
		'error.email_invalid': 'L’email n’est pas valide.',
		'error.mobile_required': 'Le numéro de portable est requis.',
		'error.username_required': 'Le username Hodi vCard est requis.',
		'error.username_invalid': 'Le username ne peut contenir que des lettres minuscules, chiffres et tirets.',
		'error.username_length': 'Le username doit faire entre 3 et 50 caractères.',
		'error.email_missing_auth': 'L’email du propriétaire est manquant (problème d’auth).',

		// --- Modifier popup ---
		'modify.title': 'Vous souhaitez modifier votre vCard ?',
		'modify.subtitle': 'Cette vCard est la vôtre et vous souhaitez y apporter des modifications ?',
		'modify.description':
			'Nous envoyons un lien de modification à l’adresse email associée à cette vCard :',
		'modify.cta': 'Recevoir le lien de modification',
		'modify.close': 'Fermer',
		'modify.sending': 'Envoi en cours…',
		'modify.sent_title': '✓ Lien envoyé',
		'modify.sent_description':
			'Un lien de modification a été envoyé à <strong>{email}</strong>.<br>Il est valable 4 heures. Vérifiez votre boîte mail (et les spams).',
		'modify.sent_footnote':
			'Vous pouvez fermer cette fenêtre. En cliquant sur le lien reçu par email, vous serez connecté automatiquement.',
		'modify.error_no_email': 'Cette vCard n’a pas d’email associé.',
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
		'cropper.credit': 'Photos libres de droits, crédit photographe automatique',

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
		'public.notfound_title': '404 - vCard introuvable',
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
		'signature.download_btn': 'Télécharger en fichier HTML',
		'signature.downloaded': '✓ Fichier HTML téléchargé.',
		'signature.need_vcard': 'Vous devez d’abord créer votre vCard pour générer une signature mail.',
		'signature.add_contact': 'Ajouter à mes contacts',
		'signature.copied': '✓ Signature copiée. Collez-la dans votre client mail (mode HTML).',
		'signature.copied_btn': 'Copié ✓',
		'signature.copy_error': 'Impossible de copier : {message}',

		// --- Image source (Unsplash) ---
		'source.prompt': 'Tapez un mot-clé pour rechercher des images libres de droits sur Unsplash.',
		'source.searching': 'Recherche…',
		'source.no_results': 'Aucun résultat. Essayez un autre mot-clé.',
		'source.fetch_error': 'Impossible de récupérer cette image : {message}',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Veuillez saisir votre adresse email.',
		'retrieve.checking': 'Vérification…',
		'retrieve.none':
			'Aucune vCard n’est associée à <strong>{email}</strong>.<br>Vous pouvez en créer une depuis le bouton « Créer ma vCard Hodi » sur cette page.',
		'retrieve.sent':
			'✓ Un lien de récupération vient d’être envoyé à <strong>{email}</strong>.<br>Cliquez sur le lien dans l’email pour accéder à votre vCard.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Disponible après la création de votre vCard.',
		'form.slug_locked_title': 'Le slug ne peut pas être modifié après création.',
		'form.your_vcard_url': 'URL de votre vCard :',
		'form.preview': 'Aperçu',
		'form.checking': 'Vérification…',
		'form.sending_email': 'Envoi de l’email…',
		'form.email_sent_btn': 'Email envoyé ✓',
		'form.finalizing_btn': 'Finalisation…',
		'form.delete_confirm':
			'Confirmer la suppression définitive de la vCard « {slug} » ?\n\nCette action est irréversible et casse tous les liens / QR codes existants.',
		'feedback.generating_wallpaper': 'Génération de votre fond d’écran Hodi…',
		'feedback.create_conflict': 'Erreur : une vCard existe déjà pour cet email ou ce username.',
	},

	// Kiswahili — traduction à faire relire par un locuteur natif avant lancement.
	sw: {
		// --- Header ---
		'header.visit_hodi': 'Tembelea Hodi.host',
		'header.lang_label': 'Lugha',

		// --- Meta ---
		'meta.title': 'Hodi vCard - Kutoka Hodi, wingu la Afrika lililounganishwa',
		'meta.description':
			'Kadi yako ya mawasiliano ya kidijitali, iliyotengenezwa Afrika. Imesimbwa, salama, haitumiwi kamwe kibiashara.',

		// --- Footer ---
		'footer.logo_label': 'Hodi - Host different.',
		'footer.legal': 'Ilani za kisheria',
		'footer.privacy': 'Sera ya faragha',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'Hakuna karatasi',
		'hero.badge_no_card': 'Hakuna kadi halisi',
		'hero.badge_no_app': 'Hakuna programu',
		'hero.title_line1': 'Kadi ya mawasiliano ya kidijitali.',
		'hero.title_line2': 'Bure.',
		'hero.cta': 'Ninatengeneza vCard yangu ya Hodi',
		'hero.retrieve_link': 'Tayari nina vCard, nirejeshee ufikiaji',
		'hero.pitch':
			'Hodi inakupa kadi yako binafsi ya mawasiliano ya kidijitali.<br>Data yako huhifadhiwa kwa usalama, na haitumiwi kamwe kwa madhumuni ya kibiashara.',

		// --- Retrieve popup ---
		'retrieve.title': 'Rejesha vCard yangu ya Hodi',
		'retrieve.intro':
			'Weka barua pepe inayohusishwa na vCard yako ya Hodi. Tutakutumia kiungo cha matumizi ya mara moja ili kuifikia na kuihariri.',
		'retrieve.email_placeholder': 'barua@pepe.com',
		'retrieve.send_btn': 'Tuma kiungo cha urejeshaji',

		// --- Tabs admin ---
		'tabs.my_info': 'Taarifa zangu',
		'tabs.my_wallpapers': 'Mandhari zangu',
		'tabs.my_signature': 'Sahihi yangu ya barua pepe',

		// --- Form (mes-infos) ---
		'form.intro':
			'Data unayoweka hapa hutumika tu kutengeneza vCard yako. Huhifadhiwa kwa usalama na haitatumiwa kamwe kwa madhumuni ya kibiashara.',

		'form.username_label': 'Anwani ya Hodi vCard',
		'form.username_placeholder': 'jina-lako',
		'form.check_btn': 'Angalia',
		'form.email_label': 'Barua pepe',
		'form.email_placeholder': 'barua@pepe.com',
		'form.email_hint': 'Barua pepe hii imeunganishwa na akaunti yako ya Hodi na haiwezi kubadilishwa.',
		'form.first_name_label': 'Jina la kwanza',
		'form.last_name_label': 'Jina la familia',
		'form.organization_label': 'Shirika',
		'form.role_label': 'Wadhifa',

		'form.section_contact': 'Maelezo ya mawasiliano',
		'form.mobile_label': 'Simu ya mkononi',
		'form.whatsapp_checkbox': 'Nambari hii inapatikana pia kwenye WhatsApp',
		'form.landline_label': 'Simu ya mezani',
		'form.address_label': 'Anwani',
		'form.address_placeholder': 'Anwani yako ya posta',
		'form.website_label': 'Tovuti',
		'form.booking_label': 'Weka miadi',

		'form.section_socials': 'Mitandao ya kijamii',

		'form.section_link': 'Kiungo maalum (hiari)',
		'form.doc_label_label': 'Kichwa cha kiungo',
		'form.doc_label_placeholder': 'Portfolio yangu, brosha, makala…',
		'form.doc_url_label': 'URL',
		'form.doc_url_placeholder': 'https://...',
		'form.doc_hint': 'Kiungo unachotaka kuangazia kwenye vCard yako: portfolio, brosha ya PDF, makala…',

		'form.save_create': 'Tengeneza vCard yangu',
		'form.save_update': 'Hifadhi taarifa zangu',
		'form.delete': 'Futa vCard yangu kabisa',

		'form.placeholder_empty': 'Haijawekwa',

		// --- Slug check feedback ---
		'slug.empty': 'Andika anwani ya vCard kabla ya kuangalia.',
		'slug.too_short': 'Fupi mno: angalau herufi 3.',
		'slug.checking': 'Inakagua…',
		'slug.available': '✓ "{slug}" inapatikana!',
		'slug.taken': '✗ "{slug}" tayari imechukuliwa.',
		'slug.error': 'Hitilafu: {message}',

		// --- Feedback messages (JS) ---
		'feedback.no_vcard_yet': 'Bado huna vCard. Jaza fomu hii na ubofye "Tengeneza vCard yangu" chini.',
		'feedback.network_error': 'Hitilafu ya mtandao. Angalia muunganisho wako na ujaribu tena.',
		'feedback.no_vcard_to_delete': 'Huna vCard ya kufuta.',
		'feedback.deleted': 'vCard imefutwa. Unaweza kutengeneza mpya hapo juu.',
		'feedback.saved': '✓ Mabadiliko yamehifadhiwa.<br>Kiungo cha umma: <a href="{url}">{url}</a>',
		'feedback.email_already_used':
			'vCard tayari ipo kwa <strong>{email}</strong>. Ili kuihariri, bofya "Hariri" chini ya vCard hiyo.',
		'feedback.slug_taken': 'Anwani ya vCard "{slug}" tayari imechukuliwa. Chagua nyingine.',
		'feedback.create_email_sent':
			'<strong>✓ Barua pepe ya uthibitisho imetumwa!</strong><br>Kiungo kimetumwa hivi punde kwa <strong>{email}</strong>.<br>Bofya ili <strong>kukamilisha kuunda</strong> vCard yako.<br><br><span style="opacity: 0.7;">Unaweza kufunga dirisha hili. Kiungo kinafanya kazi kwa saa 4.</span>',
		'feedback.finalizing': 'Inakamilisha kuunda vCard yako…',
		'feedback.uploading_cover': 'Inapakia jalada…',
		'feedback.uploading_avatar': 'Inapakia picha ya wasifu…',
		'feedback.created_redirecting': '✓ vCard imetengenezwa! Inaelekeza kwenye kadi yako ya umma…',

		// --- Validation errors ---
		'error.first_name_required': 'Jina la kwanza linahitajika.',
		'error.last_name_required': 'Jina la familia linahitajika.',
		'error.email_required': 'Barua pepe inahitajika.',
		'error.email_invalid': 'Barua pepe si sahihi.',
		'error.mobile_required': 'Nambari ya simu ya mkononi inahitajika.',
		'error.username_required': 'Anwani ya Hodi vCard inahitajika.',
		'error.username_invalid': 'Anwani ya vCard inaweza kuwa na herufi ndogo, tarakimu na vistari pekee.',
		'error.username_length': 'Anwani ya vCard lazima iwe na herufi 3 hadi 50.',
		'error.email_missing_auth': 'Barua pepe ya mmiliki haipo (tatizo la uthibitishaji).',

		// --- Modifier popup ---
		'modify.title': 'Unataka kuhariri vCard yako?',
		'modify.subtitle': 'vCard hii ni yako na unataka kuisasisha?',
		'modify.description': 'Tutatuma kiungo cha kipekee cha kuhariri kwa barua pepe inayohusishwa na vCard hii:',
		'modify.cta': 'Nitumie kiungo cha kuhariri',
		'modify.close': 'Funga',
		'modify.sending': 'Inatuma…',
		'modify.sent_title': '✓ Kiungo kimetumwa',
		'modify.sent_description':
			'Kiungo cha kuhariri kimetumwa kwa <strong>{email}</strong>.<br>Kinafanya kazi kwa saa 4. Angalia kikasha chako (na folda ya Spam).',
		'modify.sent_footnote':
			'Unaweza kufunga dirisha hili. Ukibofya kiungo kwenye barua pepe yako, utaingia kiotomatiki.',
		'modify.error_no_email': 'vCard hii haina barua pepe inayohusishwa.',
		'modify.error_network': 'Hitilafu ya mtandao imetokea. Angalia muunganisho wako na ujaribu tena.',

		// --- Public vCard actions ---
		'public.visit_website': 'Tembelea tovuti yangu',
		'public.book_appointment': 'Weka miadi',
		'public.save_contact': 'Hifadhi kadi ya mawasiliano',
		'public.edit': '> Hariri',

		// --- Cropper popup ---
		'cropper.title_avatar': 'Picha mpya ya wasifu',
		'cropper.title_cover': 'Picha mpya ya jalada',
		'cropper.title_wallpaper': 'Mandhari mpya ya simu',
		'cropper.drag_or': 'Buruta picha yako hapa au…',
		'cropper.browse': 'Vinjari',
		'cropper.limit': 'Upeo MB 2, JPG au PNG',
		'cropper.save': 'Hifadhi picha',
		'cropper.new_image': 'Picha mpya',
		'cropper.source_computer': 'Kompyuta yangu',
		'cropper.source_library': 'Maktaba ya picha',
		'cropper.search_placeholder': 'Pwani, msitu, jiji, dhahania…',
		'cropper.credit': 'Picha zisizo na mrabaha, sifa ya mpiga picha kiotomatiki',

		// --- Common ---
		'common.retry': 'Jaribu tena',
		'common.saving': 'Inahifadhi…',
		'common.error': 'Hitilafu: {message}',
		'modify.error_title': 'Imeshindwa kutuma kiungo',

		// --- Public vCard (states + labels) ---
		'public.contact_landline': 'Simu ya mezani',
		'public.contact_website': 'Tovuti',
		'public.empty_title': 'Kiungo hakijabainishwa',
		'public.empty_body': 'Ukurasa huu unahitaji kigezo <code>?slug=xxx</code> kwenye URL.',
		'public.back_home': '← Rudi mwanzo',
		'public.notfound_title': '404 - vCard haikupatikana',
		'public.notfound_body': 'Hakuna vCard inayolingana na anwani <strong>{slug}</strong>.',
		'public.error_title': 'Hitilafu imetokea',
		'public.vcf_error': 'Hitilafu katika kutengeneza kadi ya mawasiliano. Tafadhali jaribu tena.',

		// --- Wallpapers (mes-fonds) ---
		'wallpapers.intro': 'Tengeneza na ubinafsishe mandhari ya skrini iliyofungwa kwa simu yako:',
		'wallpapers.need_vcard': 'Lazima utengeneze vCard yako kwanza.',
		'wallpapers.add': 'Ongeza',
		'wallpapers.download': 'Pakua',
		'wallpapers.delete': 'Futa',
		'wallpapers.delete_confirm': 'Futa mandhari hii?',
		'wallpapers.composing': 'Inatengeneza mandhari…',
		'wallpapers.limit_reached': 'Umefikia kikomo cha mandhari {max}.',
		'wallpapers.create_error': 'Hitilafu katika kutengeneza mandhari: {message}',
		'wallpapers.delete_error': 'Hitilafu ya kufuta: {message}',

		// --- Email signature ---
		'signature.intro': 'Pachika sahihi yako ya barua pepe yenye kiungo cha vCard yako ya Hodi:',
		'signature.copy_btn': 'Nakili msimbo wa HTML wa sahihi yangu',
		'signature.download_btn': 'Pakua kama faili la HTML',
		'signature.downloaded': '✓ Faili la HTML limepakuliwa.',
		'signature.need_vcard': 'Lazima utengeneze vCard yako kwanza ili kutengeneza sahihi ya barua pepe.',
		'signature.add_contact': 'Ongeza kwa anwani zangu',
		'signature.copied': '✓ Sahihi imenakiliwa. Ibandike kwenye programu yako ya barua pepe (hali ya HTML).',
		'signature.copied_btn': 'Imenakiliwa ✓',
		'signature.copy_error': 'Imeshindwa kunakili: {message}',

		// --- Image source (Unsplash) ---
		'source.prompt': 'Andika neno muhimu kutafuta picha zisizo na mrabaha kwenye Unsplash.',
		'source.searching': 'Inatafuta…',
		'source.no_results': 'Hakuna matokeo. Jaribu neno jingine.',
		'source.fetch_error': 'Imeshindwa kupata picha hii: {message}',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Tafadhali weka anwani yako ya barua pepe.',
		'retrieve.checking': 'Inakagua…',
		'retrieve.none':
			'Hakuna vCard inayohusishwa na <strong>{email}</strong>.<br>Unaweza kutengeneza moja kwa kitufe cha "Tengeneza vCard yangu ya Hodi" kwenye ukurasa huu.',
		'retrieve.sent':
			'✓ Kiungo cha urejeshaji kimetumwa hivi punde kwa <strong>{email}</strong>.<br>Bofya kiungo kwenye barua pepe ili kufikia vCard yako.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Inapatikana baada ya kutengeneza vCard yako.',
		'form.slug_locked_title': 'Anwani ya vCard haiwezi kubadilishwa baada ya kuundwa.',
		'form.your_vcard_url': 'URL ya vCard yako:',
		'form.preview': 'Hakiki',
		'form.checking': 'Inakagua…',
		'form.sending_email': 'Inatuma barua pepe…',
		'form.email_sent_btn': 'Barua pepe imetumwa ✓',
		'form.finalizing_btn': 'Inakamilisha…',
		'form.delete_confirm':
			'Futa kabisa vCard "{slug}"?\n\nKitendo hiki hakiwezi kutenduliwa na kitaharibu viungo / misimbo ya QR yote iliyopo.',
		'feedback.generating_wallpaper': 'Inatengeneza mandhari yako ya Hodi…',
		'feedback.create_conflict': 'Hitilafu: vCard tayari ipo kwa barua pepe au anwani hii ya vCard.',
	},

	// Português (variante europeia / africana — Angola, Moçambique).
	pt: {
		// --- Header ---
		'header.visit_hodi': 'Visitar Hodi.host',
		'header.lang_label': 'Idioma',

		// --- Meta ---
		'meta.title': 'Hodi vCard - Pela Hodi, a nuvem africana unificada',
		'meta.description':
			'O seu cartão de visita virtual, feito em África. Encriptado, seguro, nunca usado comercialmente.',

		// --- Footer ---
		'footer.logo_label': 'Hodi - Host different.',
		'footer.legal': 'Aviso legal',
		'footer.privacy': 'Política de privacidade',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'Sem papel',
		'hero.badge_no_card': 'Sem cartão físico',
		'hero.badge_no_app': 'Sem aplicação',
		'hero.title_line1': 'O cartão de visita digital.',
		'hero.title_line2': 'Grátis.',
		'hero.cta': 'Eu crio o meu Hodi vCard',
		'hero.retrieve_link': 'Já tenho um vCard, recuperar o meu acesso',
		'hero.pitch':
			'A Hodi oferece-lhe o seu cartão de visita virtual e pessoal.<br>Os seus dados são armazenados de forma segura e nunca usados para fins comerciais.',

		// --- Retrieve popup ---
		'retrieve.title': 'Recuperar o meu Hodi vCard',
		'retrieve.intro':
			'Introduza o email associado ao seu Hodi vCard. Enviar-lhe-emos um link de utilização única para o aceder e editar.',
		'retrieve.email_placeholder': 'seu@email.com',
		'retrieve.send_btn': 'Enviar link de recuperação',

		// --- Tabs admin ---
		'tabs.my_info': 'As minhas informações',
		'tabs.my_wallpapers': 'Os meus fundos de ecrã',
		'tabs.my_signature': 'A minha assinatura de email',

		// --- Form (mes-infos) ---
		'form.intro':
			'Os dados que introduz aqui são usados apenas para gerar o seu vCard. São armazenados de forma segura e nunca serão usados para fins comerciais.',

		'form.username_label': 'Nome de utilizador Hodi vCard',
		'form.username_placeholder': 'o-seu-nome-de-utilizador',
		'form.check_btn': 'Verificar',
		'form.email_label': 'Email',
		'form.email_placeholder': 'seu@email.com',
		'form.email_hint': 'Este email está associado à sua conta Hodi e não pode ser alterado.',
		'form.first_name_label': 'Nome próprio',
		'form.last_name_label': 'Apelido',
		'form.organization_label': 'Organização',
		'form.role_label': 'Função',

		'form.section_contact': 'Dados de contacto',
		'form.mobile_label': 'Telemóvel',
		'form.whatsapp_checkbox': 'Este número também está disponível no WhatsApp',
		'form.landline_label': 'Telefone fixo',
		'form.address_label': 'Morada',
		'form.address_placeholder': 'A sua morada postal',
		'form.website_label': 'Website',
		'form.booking_label': 'Marcar uma reunião',

		'form.section_socials': 'Redes sociais',

		'form.section_link': 'Link personalizado (opcional)',
		'form.doc_label_label': 'Título do link',
		'form.doc_label_placeholder': 'O meu portefólio, brochura, um artigo…',
		'form.doc_url_label': 'URL',
		'form.doc_url_placeholder': 'https://...',
		'form.doc_hint': 'Um link que queira destacar no seu vCard: portefólio, brochura em PDF, artigo…',

		'form.save_create': 'Criar o meu vCard',
		'form.save_update': 'Guardar as minhas informações',
		'form.delete': 'Eliminar o meu vCard permanentemente',

		'form.placeholder_empty': 'Não fornecido',

		// --- Slug check feedback ---
		'slug.empty': 'Escreva um nome de utilizador antes de verificar.',
		'slug.too_short': 'Demasiado curto: mínimo de 3 caracteres.',
		'slug.checking': 'A verificar…',
		'slug.available': '✓ "{slug}" está disponível!',
		'slug.taken': '✗ "{slug}" já está em uso.',
		'slug.error': 'Erro: {message}',

		// --- Feedback messages (JS) ---
		'feedback.no_vcard_yet':
			'Ainda não tem um vCard. Preencha este formulário e clique em "Criar o meu vCard" no fim.',
		'feedback.network_error': 'Erro de rede. Verifique a sua ligação e tente novamente.',
		'feedback.no_vcard_to_delete': 'Não tem um vCard para eliminar.',
		'feedback.deleted': 'vCard eliminado. Pode criar um novo acima.',
		'feedback.saved': '✓ Alterações guardadas.<br>Link público: <a href="{url}">{url}</a>',
		'feedback.email_already_used':
			'Já existe um vCard para <strong>{email}</strong>. Para o editar, clique em "Editar" no fim desse vCard.',
		'feedback.slug_taken': 'O endereço de vCard "{slug}" já está em uso. Escolha outro.',
		'feedback.create_email_sent':
			'<strong>✓ Email de confirmação enviado!</strong><br>Acabámos de enviar um link para <strong>{email}</strong>.<br>Clique nele para <strong>finalizar a criação</strong> do seu vCard.<br><br><span style="opacity: 0.7;">Pode fechar esta janela. O link é válido durante 4 horas.</span>',
		'feedback.finalizing': 'A finalizar a criação do seu vCard…',
		'feedback.uploading_cover': 'A carregar a capa…',
		'feedback.uploading_avatar': 'A carregar a foto de perfil…',
		'feedback.created_redirecting': '✓ vCard criado! A redirecionar para o seu cartão público…',

		// --- Validation errors ---
		'error.first_name_required': 'O nome próprio é obrigatório.',
		'error.last_name_required': 'O apelido é obrigatório.',
		'error.email_required': 'O email é obrigatório.',
		'error.email_invalid': 'O email não é válido.',
		'error.mobile_required': 'O número de telemóvel é obrigatório.',
		'error.username_required': 'O nome de utilizador Hodi vCard é obrigatório.',
		'error.username_invalid': 'O nome de utilizador só pode conter letras minúsculas, algarismos e hífenes.',
		'error.username_length': 'O nome de utilizador deve ter entre 3 e 50 caracteres.',
		'error.email_missing_auth': 'O email do proprietário está em falta (problema de autenticação).',

		// --- Modifier popup ---
		'modify.title': 'Quer editar o seu vCard?',
		'modify.subtitle': 'Este vCard é seu e quer atualizá-lo?',
		'modify.description': 'Vamos enviar um link único de edição para o email associado a este vCard:',
		'modify.cta': 'Enviar-me o link de edição',
		'modify.close': 'Fechar',
		'modify.sending': 'A enviar…',
		'modify.sent_title': '✓ Link enviado',
		'modify.sent_description':
			'Foi enviado um link de edição para <strong>{email}</strong>.<br>É válido durante 4 horas. Verifique a sua caixa de entrada (e a pasta de spam).',
		'modify.sent_footnote':
			'Pode fechar esta janela. Ao clicar no link recebido por email, será autenticado automaticamente.',
		'modify.error_no_email': 'Este vCard não tem email associado.',
		'modify.error_network': 'Ocorreu um erro de rede. Verifique a sua ligação e tente novamente.',

		// --- Public vCard actions ---
		'public.visit_website': 'Visitar o meu website',
		'public.book_appointment': 'Marcar uma reunião',
		'public.save_contact': 'Guardar cartão de contacto',
		'public.edit': '> Editar',

		// --- Cropper popup ---
		'cropper.title_avatar': 'Nova foto de perfil',
		'cropper.title_cover': 'Nova imagem de capa',
		'cropper.title_wallpaper': 'Novo fundo de ecrã',
		'cropper.drag_or': 'Arraste a sua imagem para aqui ou…',
		'cropper.browse': 'Procurar',
		'cropper.limit': 'Máximo 2 MB, JPG ou PNG',
		'cropper.save': 'Guardar imagem',
		'cropper.new_image': 'Nova imagem',
		'cropper.source_computer': 'O meu computador',
		'cropper.source_library': 'Biblioteca de imagens',
		'cropper.search_placeholder': 'Praia, floresta, cidade, abstrato…',
		'cropper.credit': 'Fotos livres de direitos, crédito automático ao fotógrafo',

		// --- Common ---
		'common.retry': 'Tentar novamente',
		'common.saving': 'A guardar…',
		'common.error': 'Erro: {message}',
		'modify.error_title': 'Não foi possível enviar o link',

		// --- Public vCard (states + labels) ---
		'public.contact_landline': 'Telefone fixo',
		'public.contact_website': 'Website',
		'public.empty_title': 'Endereço não especificado',
		'public.empty_body': 'Esta página requer um parâmetro <code>?slug=xxx</code> no URL.',
		'public.back_home': '← Voltar ao início',
		'public.notfound_title': '404 - vCard não encontrado',
		'public.notfound_body': 'Nenhum vCard corresponde ao endereço <strong>{slug}</strong>.',
		'public.error_title': 'Ocorreu um erro',
		'public.vcf_error': 'Erro ao gerar o cartão de contacto. Tente novamente.',

		// --- Wallpapers (mes-fonds) ---
		'wallpapers.intro': 'Crie e personalize fundos para o ecrã de bloqueio do seu smartphone:',
		'wallpapers.need_vcard': 'Tem de criar primeiro o seu vCard.',
		'wallpapers.add': 'Adicionar',
		'wallpapers.download': 'Transferir',
		'wallpapers.delete': 'Eliminar',
		'wallpapers.delete_confirm': 'Eliminar este fundo de ecrã?',
		'wallpapers.composing': 'A compor o fundo de ecrã…',
		'wallpapers.limit_reached': 'Atingiu o limite de {max} fundos de ecrã.',
		'wallpapers.create_error': 'Erro ao criar o fundo de ecrã: {message}',
		'wallpapers.delete_error': 'Erro ao eliminar: {message}',

		// --- Email signature ---
		'signature.intro': 'Incorpore a sua assinatura de email com um link para o seu Hodi vCard:',
		'signature.copy_btn': 'Copiar o código HTML da minha assinatura',
		'signature.download_btn': 'Transferir como ficheiro HTML',
		'signature.downloaded': '✓ Ficheiro HTML transferido.',
		'signature.need_vcard': 'Tem de criar primeiro o seu vCard para gerar uma assinatura de email.',
		'signature.add_contact': 'Adicionar aos meus contactos',
		'signature.copied': '✓ Assinatura copiada. Cole-a no seu cliente de email (modo HTML).',
		'signature.copied_btn': 'Copiado ✓',
		'signature.copy_error': 'Não foi possível copiar: {message}',

		// --- Image source (Unsplash) ---
		'source.prompt': 'Escreva uma palavra-chave para pesquisar imagens livres de direitos no Unsplash.',
		'source.searching': 'A pesquisar…',
		'source.no_results': 'Sem resultados. Tente outra palavra-chave.',
		'source.fetch_error': 'Não foi possível obter esta imagem: {message}',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'Introduza o seu endereço de email.',
		'retrieve.checking': 'A verificar…',
		'retrieve.none':
			'Nenhum vCard está associado a <strong>{email}</strong>.<br>Pode criar um com o botão "Criar o meu Hodi vCard" nesta página.',
		'retrieve.sent':
			'✓ Acabámos de enviar um link de recuperação para <strong>{email}</strong>.<br>Clique no link do email para aceder ao seu vCard.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'Disponível após criar o seu vCard.',
		'form.slug_locked_title': 'O nome de utilizador não pode ser alterado após a criação.',
		'form.your_vcard_url': 'O URL do seu vCard:',
		'form.preview': 'Pré-visualizar',
		'form.checking': 'A verificar…',
		'form.sending_email': 'A enviar email…',
		'form.email_sent_btn': 'Email enviado ✓',
		'form.finalizing_btn': 'A finalizar…',
		'form.delete_confirm':
			'Eliminar permanentemente o vCard "{slug}"?\n\nEsta ação é irreversível e quebra todos os links / códigos QR existentes.',
		'feedback.generating_wallpaper': 'A gerar o seu fundo de ecrã Hodi…',
		'feedback.create_conflict': 'Erro: já existe um vCard para este email ou nome de utilizador.',
	},

	// العربية (الفصحى الحديثة) — اللغة من اليمين إلى اليسار (RTL). تحتاج إلى مراجعة لغوية أصلية.
	ar: {
		// --- Header ---
		'header.visit_hodi': 'زيارة Hodi.host',
		'header.lang_label': 'اللغة',

		// --- Meta ---
		'meta.title': 'Hodi vCard - من Hodi، السحابة الأفريقية الموحّدة',
		'meta.description': 'بطاقة عملك الافتراضية، مصنوعة في أفريقيا. مشفّرة وآمنة ولا تُستخدم تجاريًا أبدًا.',

		// --- Footer ---
		'footer.logo_label': 'Hodi - Host different.',
		'footer.legal': 'إشعار قانوني',
		'footer.privacy': 'سياسة الخصوصية',

		// --- Home / Hero ---
		'hero.badge_no_paper': 'بلا ورق',
		'hero.badge_no_card': 'بلا بطاقة ماديّة',
		'hero.badge_no_app': 'بلا تطبيق',
		'hero.title_line1': 'بطاقة العمل الرقمية.',
		'hero.title_line2': 'مجانية.',
		'hero.cta': 'أنشئ بطاقة Hodi الخاصة بي',
		'hero.retrieve_link': 'لديّ بطاقة vCard بالفعل، استعادة الوصول إليها',
		'hero.pitch':
			'تمنحك Hodi بطاقة عملك الرقمية الشخصية.<br>تُخزَّن بياناتك بأمان، ولا تُستخدم أبدًا لأغراض تجارية.',

		// --- Retrieve popup ---
		'retrieve.title': 'استعادة بطاقة Hodi vCard الخاصة بي',
		'retrieve.intro':
			'أدخل البريد الإلكتروني المرتبط ببطاقة Hodi vCard الخاصة بك. سنرسل لك رابطًا لمرة واحدة للوصول إليها وتعديلها.',
		'retrieve.email_placeholder': 'your@email.com',
		'retrieve.send_btn': 'إرسال رابط الاستعادة',

		// --- Tabs admin ---
		'tabs.my_info': 'معلوماتي',
		'tabs.my_wallpapers': 'خلفياتي',
		'tabs.my_signature': 'توقيع بريدي الإلكتروني',

		// --- Form (mes-infos) ---
		'form.intro':
			'البيانات التي تدخلها هنا تُستخدم فقط لإنشاء بطاقتك. تُخزَّن بأمان ولن تُستخدم أبدًا لأغراض تجارية.',

		'form.username_label': 'اسم المستخدم في Hodi vCard',
		'form.username_placeholder': 'your-username',
		'form.check_btn': 'تحقّق',
		'form.email_label': 'البريد الإلكتروني',
		'form.email_placeholder': 'your@email.com',
		'form.email_hint': 'هذا البريد الإلكتروني مرتبط بحسابك في Hodi ولا يمكن تغييره.',
		'form.first_name_label': 'الاسم الأول',
		'form.last_name_label': 'اسم العائلة',
		'form.organization_label': 'المؤسسة',
		'form.role_label': 'المنصب',

		'form.section_contact': 'بيانات الاتصال',
		'form.mobile_label': 'الهاتف المحمول',
		'form.whatsapp_checkbox': 'هذا الرقم متاح أيضًا على WhatsApp',
		'form.landline_label': 'الهاتف الثابت',
		'form.address_label': 'العنوان',
		'form.address_placeholder': 'عنوانك البريدي',
		'form.website_label': 'الموقع الإلكتروني',
		'form.booking_label': 'حجز موعد',

		'form.section_socials': 'شبكات التواصل الاجتماعي',

		'form.section_link': 'رابط مخصّص (اختياري)',
		'form.doc_label_label': 'عنوان الرابط',
		'form.doc_label_placeholder': 'ملف أعمالي، كتيّب، مقال…',
		'form.doc_url_label': 'URL',
		'form.doc_url_placeholder': 'https://...',
		'form.doc_hint': 'رابط تريد إبرازه على بطاقتك: ملف أعمال، كتيّب PDF، مقال…',

		'form.save_create': 'إنشاء بطاقتي',
		'form.save_update': 'حفظ معلوماتي',
		'form.delete': 'حذف بطاقتي نهائيًا',

		'form.placeholder_empty': 'غير مُقدَّم',

		// --- Slug check feedback ---
		'slug.empty': 'اكتب اسم مستخدم قبل التحقّق.',
		'slug.too_short': 'قصير جدًا: 3 أحرف على الأقل.',
		'slug.checking': 'جارٍ التحقّق…',
		'slug.available': '✓ "{slug}" متاح!',
		'slug.taken': '✗ "{slug}" مُستخدَم بالفعل.',
		'slug.error': 'خطأ: {message}',

		// --- Feedback messages (JS) ---
		'feedback.no_vcard_yet': 'ليس لديك بطاقة vCard بعد. املأ هذا النموذج واضغط "إنشاء بطاقتي" في الأسفل.',
		'feedback.network_error': 'خطأ في الشبكة. تحقّق من اتصالك وحاول مرة أخرى.',
		'feedback.no_vcard_to_delete': 'ليس لديك بطاقة vCard لحذفها.',
		'feedback.deleted': 'تم حذف البطاقة. يمكنك إنشاء واحدة جديدة في الأعلى.',
		'feedback.saved': '✓ تم حفظ التغييرات.<br>الرابط العام: <a href="{url}">{url}</a>',
		'feedback.email_already_used':
			'توجد بطاقة vCard بالفعل لـ <strong>{email}</strong>. لتعديلها، اضغط "تعديل" في أسفل تلك البطاقة.',
		'feedback.slug_taken': 'عنوان vCard "{slug}" مستخدم بالفعل. اختر عنوانًا آخر.',
		'feedback.create_email_sent':
			'<strong>✓ تم إرسال بريد التأكيد!</strong><br>أُرسل رابط للتو إلى <strong>{email}</strong>.<br>اضغط عليه لـ<strong>إتمام إنشاء</strong> بطاقتك.<br><br><span style="opacity: 0.7;">يمكنك إغلاق هذه النافذة. الرابط صالح لمدة 4 ساعات.</span>',
		'feedback.finalizing': 'جارٍ إتمام إنشاء بطاقتك…',
		'feedback.uploading_cover': 'جارٍ رفع صورة الغلاف…',
		'feedback.uploading_avatar': 'جارٍ رفع صورة الملف الشخصي…',
		'feedback.created_redirecting': '✓ تم إنشاء البطاقة! جارٍ التحويل إلى بطاقتك العامة…',

		// --- Validation errors ---
		'error.first_name_required': 'الاسم الأول مطلوب.',
		'error.last_name_required': 'اسم العائلة مطلوب.',
		'error.email_required': 'البريد الإلكتروني مطلوب.',
		'error.email_invalid': 'البريد الإلكتروني غير صالح.',
		'error.mobile_required': 'رقم الهاتف المحمول مطلوب.',
		'error.username_required': 'اسم المستخدم في Hodi vCard مطلوب.',
		'error.username_invalid': 'يمكن أن يحتوي اسم المستخدم على أحرف لاتينية صغيرة وأرقام وشرطات فقط.',
		'error.username_length': 'يجب أن يكون اسم المستخدم بين 3 و50 حرفًا.',
		'error.email_missing_auth': 'بريد المالك مفقود (مشكلة في المصادقة).',

		// --- Modifier popup ---
		'modify.title': 'تريد تعديل بطاقتك؟',
		'modify.subtitle': 'هذه البطاقة لك وتريد تحديثها؟',
		'modify.description': 'سنرسل رابط تعديل فريدًا إلى البريد الإلكتروني المرتبط بهذه البطاقة:',
		'modify.cta': 'أرسل لي رابط التعديل',
		'modify.close': 'إغلاق',
		'modify.sending': 'جارٍ الإرسال…',
		'modify.sent_title': '✓ تم إرسال الرابط',
		'modify.sent_description':
			'تم إرسال رابط تعديل إلى <strong>{email}</strong>.<br>صالح لمدة 4 ساعات. تحقّق من بريدك الوارد (ومجلد الرسائل غير المرغوب فيها).',
		'modify.sent_footnote': 'يمكنك إغلاق هذه النافذة. عند الضغط على الرابط في بريدك، سيتم تسجيل دخولك تلقائيًا.',
		'modify.error_no_email': 'لا يوجد بريد إلكتروني مرتبط بهذه البطاقة.',
		'modify.error_network': 'حدث خطأ في الشبكة. تحقّق من اتصالك وحاول مرة أخرى.',

		// --- Public vCard actions ---
		'public.visit_website': 'زيارة موقعي الإلكتروني',
		'public.book_appointment': 'حجز موعد',
		'public.save_contact': 'حفظ بطاقة الاتصال',
		'public.edit': '‹ تعديل',

		// --- Cropper popup ---
		'cropper.title_avatar': 'صورة ملف شخصي جديدة',
		'cropper.title_cover': 'صورة غلاف جديدة',
		'cropper.title_wallpaper': 'خلفية جوال جديدة',
		'cropper.drag_or': 'اسحب صورتك إلى هنا أو…',
		'cropper.browse': 'تصفّح',
		'cropper.limit': 'بحد أقصى 2 ميغابايت، JPG أو PNG',
		'cropper.save': 'حفظ الصورة',
		'cropper.new_image': 'صورة جديدة',
		'cropper.source_computer': 'جهازي',
		'cropper.source_library': 'مكتبة الصور',
		'cropper.search_placeholder': 'شاطئ، غابة، مدينة، تجريدي…',
		'cropper.credit': 'صور خالية من حقوق الملكية، مع نسب تلقائي للمصوّر',

		// --- Common ---
		'common.retry': 'حاول مرة أخرى',
		'common.saving': 'جارٍ الحفظ…',
		'common.error': 'خطأ: {message}',
		'modify.error_title': 'تعذّر إرسال الرابط',

		// --- Public vCard (states + labels) ---
		'public.contact_landline': 'الهاتف الثابت',
		'public.contact_website': 'الموقع الإلكتروني',
		'public.empty_title': 'العنوان غير محدد',
		'public.empty_body': 'تتطلّب هذه الصفحة معاملًا <code>?slug=xxx</code> في الرابط.',
		'public.back_home': '→ العودة إلى الرئيسية',
		'public.notfound_title': '404 - البطاقة غير موجودة',
		'public.notfound_body': 'لا توجد بطاقة تطابق العنوان <strong>{slug}</strong>.',
		'public.error_title': 'حدث خطأ',
		'public.vcf_error': 'خطأ في إنشاء بطاقة الاتصال. يُرجى المحاولة مرة أخرى.',

		// --- Wallpapers (mes-fonds) ---
		'wallpapers.intro': 'أنشئ وخصّص خلفيات شاشة القفل لهاتفك الذكي:',
		'wallpapers.need_vcard': 'يجب إنشاء بطاقتك أولًا.',
		'wallpapers.add': 'إضافة',
		'wallpapers.download': 'تنزيل',
		'wallpapers.delete': 'حذف',
		'wallpapers.delete_confirm': 'حذف هذه الخلفية؟',
		'wallpapers.composing': 'جارٍ تكوين الخلفية…',
		'wallpapers.limit_reached': 'لقد وصلت إلى الحد الأقصى وهو {max} خلفيات.',
		'wallpapers.create_error': 'خطأ في إنشاء الخلفية: {message}',
		'wallpapers.delete_error': 'خطأ في الحذف: {message}',

		// --- Email signature ---
		'signature.intro': 'أدرج توقيع بريدك الإلكتروني مع رابط إلى بطاقة Hodi vCard:',
		'signature.copy_btn': 'نسخ كود HTML لتوقيعي',
		'signature.download_btn': 'تنزيل كملف HTML',
		'signature.downloaded': '✓ تم تنزيل ملف HTML.',
		'signature.need_vcard': 'يجب إنشاء بطاقتك أولًا لإنشاء توقيع بريد إلكتروني.',
		'signature.add_contact': 'إضافة إلى جهات اتصالي',
		'signature.copied': '✓ تم نسخ التوقيع. الصقه في برنامج بريدك الإلكتروني (وضع HTML).',
		'signature.copied_btn': 'تم النسخ ✓',
		'signature.copy_error': 'تعذّر النسخ: {message}',

		// --- Image source (Unsplash) ---
		'source.prompt': 'اكتب كلمة مفتاحية للبحث عن صور خالية من حقوق الملكية على Unsplash.',
		'source.searching': 'جارٍ البحث…',
		'source.no_results': 'لا توجد نتائج. جرّب كلمة مفتاحية أخرى.',
		'source.fetch_error': 'تعذّر جلب هذه الصورة: {message}',

		// --- Retrieve feedback ---
		'retrieve.email_required': 'يُرجى إدخال عنوان بريدك الإلكتروني.',
		'retrieve.checking': 'جارٍ التحقّق…',
		'retrieve.none':
			'لا توجد بطاقة vCard مرتبطة بـ <strong>{email}</strong>.<br>يمكنك إنشاء واحدة بزر "إنشاء بطاقة Hodi vCard الخاصة بي" في هذه الصفحة.',
		'retrieve.sent':
			'✓ أُرسل رابط استعادة للتو إلى <strong>{email}</strong>.<br>اضغط على الرابط في البريد للوصول إلى بطاقتك.',

		// --- Form (extra runtime labels) ---
		'form.tab_locked_title': 'متاح بعد إنشاء بطاقتك.',
		'form.slug_locked_title': 'لا يمكن تغيير اسم المستخدم بعد الإنشاء.',
		'form.your_vcard_url': 'رابط بطاقتك:',
		'form.preview': 'معاينة',
		'form.checking': 'جارٍ التحقّق…',
		'form.sending_email': 'جارٍ إرسال البريد…',
		'form.email_sent_btn': 'تم إرسال البريد ✓',
		'form.finalizing_btn': 'جارٍ الإتمام…',
		'form.delete_confirm':
			'حذف البطاقة "{slug}" نهائيًا؟\n\nهذا الإجراء لا رجعة فيه ويُبطل جميع الروابط / رموز QR الحالية.',
		'feedback.generating_wallpaper': 'جارٍ إنشاء خلفية Hodi الخاصة بك…',
		'feedback.create_conflict': 'خطأ: توجد بطاقة vCard بالفعل لهذا البريد الإلكتروني أو اسم المستخدم.',
	},
};

/**
 * Détermine la langue initiale : choix utilisateur ou langue navigateur, fallback EN.
 */
// Cookie de langue : lisible par le serveur (SSR + emails/erreurs) sur chaque
// requête, contrairement au localStorage. 1 an, tout le site, SameSite=Lax.
function setLangCookie(lang) {
	try {
		document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
	} catch {}
}
function getLangCookie() {
	try {
		const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + STORAGE_KEY + '=([a-z]{2})(?:;|$)'));
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

function detectInitialLang() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && TRANSLATIONS[saved]) return saved;
	} catch {}
	const cookie = getLangCookie();
	if (cookie && TRANSLATIONS[cookie]) return cookie;
	const nav = (navigator.language || 'en').toLowerCase();
	if (nav.startsWith('fr')) return 'fr';
	if (nav.startsWith('sw')) return 'sw';
	if (nav.startsWith('pt')) return 'pt';
	if (nav.startsWith('ar')) return 'ar';
	return 'en';
}

// Langues écrites de droite à gauche.
const RTL_LANGS = ['ar'];

/** Pose dir="rtl"/"ltr" sur <html> selon la langue. */
function applyDir(lang) {
	document.documentElement.setAttribute('dir', RTL_LANGS.includes(lang) ? 'rtl' : 'ltr');
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
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	} catch {}
	setLangCookie(lang);
	document.documentElement.setAttribute('lang', lang);
	applyDir(lang);
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
	document.querySelectorAll('[data-i18n]').forEach((el) => {
		el.textContent = t(el.getAttribute('data-i18n'));
	});
	document.querySelectorAll('[data-i18n-html]').forEach((el) => {
		el.innerHTML = t(el.getAttribute('data-i18n-html'));
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
	});
	document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
		el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
	});
	document.querySelectorAll('[data-i18n-title]').forEach((el) => {
		el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
	});
	// data-i18n-content : pour <meta content="..."> (description, og:title, etc.)
	document.querySelectorAll('[data-i18n-content]').forEach((el) => {
		el.setAttribute('content', t(el.getAttribute('data-i18n-content')));
	});
}

// Au chargement du DOM, applique les traductions et set la lang sur <html>
$(function () {
	document.documentElement.setAttribute('lang', currentLang);
	applyDir(currentLang);
	// Synchronise le cookie avec la langue active (même auto-détectée) pour que
	// le rendu serveur de la prochaine navigation soit déjà dans la bonne langue.
	setLangCookie(currentLang);
	applyTranslations();
});
