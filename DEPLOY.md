# Déploiement — www.hodi.live/vcard

## Une fois pour toutes : initialiser Git

```bash
cd "/Users/jerome/Desktop/CLAUDE AT WORK/hodi-vcard"
git init -b main
git add -A
git commit -m "Initial commit: Hodi vCard ready for prod"
# Optionnel : pousser sur GitHub plus tard
# git remote add origin git@github.com:TON_USER/hodi-vcard.git
# git push -u origin main
```

## À chaque déploiement

### 1. Build local

```bash
cd "/Users/jerome/Desktop/CLAUDE AT WORK/hodi-vcard"

# (Optionnel mais propre) Vide le dossier build de la fois d'avant
rm -rf build

# Build production : Vite compile tout dans ./build/
# Les variables VITE_* du .env sont injectées au build → la clé Supabase
# et la clé Unsplash sont baked-in. Pour changer la cible Supabase, modifie
# .env AVANT de lancer build.
npm run build
```

Le build prend ~5s, devrait afficher quelque chose comme :
```
✓ 117 modules transformed.
build/index.html                X.X kB
build/ma-vcard.html             X.X kB
build/assets/style.css          X.X kB
build/assets/app.js             X.X kB
...
✓ built in 3.5s
```

### 2. Upload sur le serveur

Le dossier `build/` contient le site **prêt à servir**. Toutes les URLs internes
sont préfixées `/vcard/` (configuré dans `vite.config.js`).

**Upload tout le contenu de `build/`** dans le dossier `/vcard/` sur le serveur
de www.hodi.live (cible : `https://www.hodi.live/vcard/`).

#### Via FTP / SFTP
```bash
# Exemple SFTP (adapte user, host, et chemin distant)
sftp jerome@hodi.live
> cd /var/www/hodi.live/public/vcard
> put -r build/* .
> exit
```

#### Via rsync (recommandé, plus rapide et n'envoie que les diffs)
```bash
rsync -avz --delete build/ jerome@hodi.live:/var/www/hodi.live/public/vcard/
```

#### Via cPanel / interface web
1. Compresse `build/` en .zip
2. File Manager → naviguer vers le dossier vcard
3. Upload le zip → extract → supprimer le zip

### 3. Configuration serveur web

Sur **Apache** (cPanel typique), crée `/vcard/.htaccess` :

```apache
# Serve index.html for /vcard/ root
DirectoryIndex index.html

# SPA-style fallback : si fichier introuvable, servir index.html
# (sauf pour les API/assets)
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^.*$ index.html [L]

# Cache des assets longue durée
<FilesMatch "\.(css|js|svg|png|jpg|jpeg|gif|woff2?)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

# HTML : revalider à chaque visite
<FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
</FilesMatch>
```

Sur **Nginx** :

```nginx
location /vcard {
    alias /var/www/hodi.live/public/vcard;
    try_files $uri $uri/ /vcard/index.html;

    location ~* \.(css|js|svg|png|jpg|jpeg|gif|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }

    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache";
    }
}
```

### 4. Configuration Supabase pour la prod

Une fois le site en ligne, dans le dashboard Supabase (cfdcdyatmfyzvtllzxdl) :

**Authentication → URL Configuration** :
- Site URL : `https://www.hodi.live/vcard/`
- Redirect URLs (autoriser les magic links à rediriger ici) :
  - `https://www.hodi.live/vcard/mes-infos.html`
  - `https://www.hodi.live/vcard/ma-vcard.html`

**Authentication → Email Templates → Magic Link** (à personnaliser pour FR + Hodi) :
- Sujet : `Votre lien de connexion à Hodi vCard`
- Corps : remplacer le template par un email Hodi-brandé

## Vérification post-déploiement

Une fois uploadé :

- [ ] `https://www.hodi.live/vcard/` → home (gradient violet, hero, CTA)
- [ ] `https://www.hodi.live/vcard/mes-infos.html` → redirige vers le popup magic link si pas connecté
- [ ] Créer une vCard test → vérifier la redirection vers `/vcard/ma-vcard.html?slug=...`
- [ ] Scanner le QR code → doit ouvrir `https://www.hodi.live/vcard/ma-vcard.html?slug=...`
- [ ] Tester le download d'un wallpaper Hodi par défaut
- [ ] Tester la copie de signature mail dans Gmail (les icônes sociales doivent se charger)

## Variables d'environnement

Le `.env` (à la racine du projet, **NON commité**) contient :

```
VITE_SUPABASE_URL=https://cfdcdyatmfyzvtllzxdl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_UNSPLASH_ACCESS_KEY=xxx
```

Ces valeurs sont **injectées au build**. Pour les changer, modifie `.env`
puis re-build et re-upload.
