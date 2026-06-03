# Hodi vCard — Stack locale (MySQL + PHP + fichiers)

Cette app n'utilise plus Supabase. Elle tourne désormais sur :

- **Base de données** : MySQL/MariaDB local (`hodi_vcard`)
- **Back-end** : API PHP (cible **PHP 8.1**) sous `src/public/api/` (→ `build/api/`), servie par Apache
- **Auth** : magic-links par email — **PHPMailer** (driver configurable : `log` / `sendmail` / `mail` / `smtp`)
- **Stockage fichiers** : disque local `storage/uploads/`, servi par PHP via `?r=file`
  (pas d'Alias Apache, fonctionne quel que soit le chemin de montage, survit aux redeploys)

Le front-end (HTML/SCSS/JS buildé par Vite) appelle l'API via `src/js/utils/api.js`.

## Chemin de montage

**Un seul build** (`npm run build`) fonctionne aux deux endroits — la base est
relative (Vite `base: './'`) et le JS calcule sa base absolue au runtime
(`utils/urls.js appBase()`). Rien ne hardcode `/vcard/`.

- **Local** : servi à la **racine** → `https://www.vcard.localhost/`
- **Prod** : sous-dossier `/vcard/` → `https://www.hodi.live/vcard/`

L'API déduit son URL de base automatiquement (`app_base_url()`), donc les magic-links
et les URLs de fichiers s'adaptent au montage sans config supplémentaire.

---

## 1. Base de données (créée avec root/root)

```bash
mysql -uroot -proot < db/schema.sql
```

Tables : `users`, `auth_tokens`, `sessions`, `vcards`, `wallpapers`.

## 2. Dépendances back-end (PHPMailer)

```bash
cd src/public/api && composer install      # crée vendor/ (PHPMailer)
```

## 3. Configuration locale

`src/public/api/config.local.php` (gitignored) surcharge `config.php`. Déjà réglé sur :

- DB : `127.0.0.1 / hodi_vcard / root / root`
- Uploads : `storage/uploads/` (chemin absolu, hors `build/`)
- Mail : driver `log` → magic-links écrits dans `storage/mail.log`
- `base_url` : vide → déduite automatiquement de la requête

Pour de **vrais emails** (drivers PHPMailer : `sendmail`, `mail`, `smtp`) :

```php
// sendmail local (Postfix/Exim/cPanel) — le plus simple en prod
'mail' => [
    'driver'        => 'sendmail',
    'from'          => 'no-reply@hodi.live',
    'sendmail_path' => '/usr/sbin/sendmail -oi -t',  // optionnel
],

// …ou SMTP
'mail' => [
    'driver' => 'smtp',
    'from'   => 'no-reply@hodi.live',
    'smtp'   => ['host'=>'smtp.xxx','port'=>587,'user'=>'…','pass'=>'…','secure'=>'tls'],
],
```

## 4. Build du front-end

```bash
npm install
npm run build
```

## 5. Apache (ton vhost)

Crée un vhost qui sert **`build/` directement à la racine** (le certificat
`www.vcard.localhost` est déjà généré via mkcert). L'essentiel :

```apache
DocumentRoot "/Users/julien/Sites/vcard/build"
ServerName   www.vcard.localhost:443
<Directory "/Users/julien/Sites/vcard/build">
    AllowOverride All        # .htaccess pour les pretty URLs
    Require all granted
</Directory>
<FilesMatch \.php$>
    SetHandler "proxy:unix:/opt/homebrew/var/run/php-8.1.sock|fcgi://localhost"
</FilesMatch>
```

Puis `127.0.0.1 www.vcard.localhost` dans `/etc/hosts` et recharger Apache.
→ **https://www.vcard.localhost/**

> Pas besoin d'Alias pour les uploads : ils sont servis par `?r=file`.
> Après une modif front **ou** PHP : `npm run build` (l'API vit dans
> `src/public/api/` et est recopiée dans `build/api/`).

## 6. Tester sans Apache (optionnel)

```bash
php -S 127.0.0.1:8799 -t src/public
# API : http://127.0.0.1:8799/api/index.php?r=auth/session
```

---

## Sécurité — correctifs apportés pendant la migration

1. **Fuite de PII corrigée** : la vue publique (`?r=vcard/public`) ne renvoie jamais
   `owner_email` ni `user_id`. L'email du compte reste privé ; l'email affiché est
   `email_public`. Pas d'endpoint de liste → pas d'énumération de masse.
2. **XSS stocké `javascript:` neutralisé** : URLs validées côté serveur (`clean_url`,
   http/https only) + garde-fou client (`safeUrl`).
3. **`owner_email` non usurpable** : forcé = email de session à la création.
4. **Self-XSS feedback corrigé** : emails échappés avant injection HTML.
5. Requêtes **préparées** (PDO), cookies **HttpOnly + Secure (HTTPS)**, jetons de
   magic-link **hashés** et à usage unique, anti-traversée sur les chemins de fichiers.

## Déploiement prod (cPanel, dossier /vcard/)

`npm run build && npm run deploy` pousse `build/` (base relative, vendor PHPMailer
inclus) sur la branche `deploy`. Sur le serveur :

- Crée la base + lance `db/schema.sql`.
- Place un `config.local.php` **sur le serveur** (hors dépôt) : identifiants MySQL
  de prod, SMTP, et `VCARD_UPLOAD_DIR` pointant un dossier **persistant hors `/vcard/`**
  (les fichiers sont servis par `?r=file`, donc aucun Alias à configurer).
- `base_url` peut rester vide → déduit automatiquement (`https://www.hodi.live/vcard/`).
