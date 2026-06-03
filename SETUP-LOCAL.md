# Hodi vCard — Setup local

Stack : front **Vite** (HTML/SCSS/JS) + API **PHP 8.1** (`src/public/api/`) + **MySQL/MariaDB**.
Mailer **PHPMailer**. Plus de Supabase.

**Un seul build** (`npm run build`, base relative) sert aux deux montages :
- Local → racine du domaine (`https://www.vcard.localhost/`)
- Prod → sous-dossier (`https://www.hodi.live/vcard/`)

Le JS calcule sa base au runtime (`utils/urls.js → appBase()`) et l'API la déduit de la
requête (`app_base_url()`) — rien ne hardcode `/vcard/`.

## Mise en route

```bash
# 1. Base de données + schéma (le script ne crée PAS la base)
mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS hodi_vcard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -uroot -proot hodi_vcard < db/schema.sql

# 2. Dépendances + build
npm install
( cd src/public/api && composer install )   # PHPMailer → vendor/
npm run build                                 # → build/
```

Tables : `users`, `auth_tokens`, `sessions`, `vcards`, `wallpapers`.

## Config locale

`src/public/api/config.local.php` (gitignored) surcharge `config.php`. Par défaut : DB
`127.0.0.1/hodi_vcard/root/root`, uploads dans `build/uploads/`, mail driver `log`
(magic-links écrits dans `storage/mail.log`, aucun envoi réel), `base_url` vide (auto).

Pour de **vrais emails** :

```php
// sendmail local (Postfix/Exim/cPanel) — sendmail_path optionnel, sinon mail() de PHP
'mail' => ['driver' => 'sendmail', 'from' => 'no-reply@hodi.live'],
// ou SMTP
'mail' => ['driver' => 'smtp', 'from' => 'no-reply@hodi.live',
           'smtp' => ['host'=>'…','port'=>587,'user'=>'…','pass'=>'…','secure'=>'tls']],
```

## Serveur web (Apache, PHP 8.1)

Sers `build/` à la racine d'un vhost. `mod_rewrite` + `AllowOverride All` sont requis
(les `.htaccess` gèrent : pretty URLs `/{slug}`, URLs sans `.html`, routeur API `api/<route>`).
Les uploads sont servis en statique depuis `build/uploads/` (PHP-FPM doit pouvoir y écrire).

```apache
DocumentRoot "/Users/julien/Sites/vcard/build"
ServerName   www.vcard.localhost:443
<Directory "/Users/julien/Sites/vcard/build">
    AllowOverride All
    Require all granted
</Directory>
<FilesMatch \.php$>
    SetHandler "proxy:unix:/opt/homebrew/var/run/php-8.1.sock|fcgi://localhost"
</FilesMatch>
```

Puis `127.0.0.1 www.vcard.localhost` dans `/etc/hosts`, recharge Apache → **https://www.vcard.localhost/**.
Après une modif front **ou** PHP : `npm run build` (l'API est recopiée dans `build/api/`).

> **Valet/nginx** : les `.htaccess` ne sont pas honorés → le routage est porté dans
> `LocalValetDriver.php` (racine du projet). `valet link` depuis la racine, `valet use php@8.1`,
> `valet secure`. Le driver sert `build/` et reproduit pretty URLs + routeur API.

## Déploiement prod

`git push origin main` → pipeline Buddy (`.buddy/pipeline.fixed.yml`) : composer + `npm run build`
+ rsync de `build/` vers `${REMOTE_DIR}` (exclut `config.local.php` et `uploads/`).
Sur le serveur, une fois : créer la base + importer `db/schema.sql`, et déposer
`api/config.local.php` (DB prod, SMTP/sendmail ; `base_url` vide).

## Sécurité (correctifs de la migration)

- Vue publique sans `owner_email`/`user_id` (pas de fuite de PII, pas d'énumération).
- URLs validées serveur (http/https only) → anti-XSS stocké ; garde-fou client `safeUrl`.
- `owner_email` forcé = email de session ; feedback HTML échappé.
- PDO préparé, cookies HttpOnly+Secure, jetons magic-link hashés à usage unique,
  anti-traversée sur les chemins de fichiers, slugs réservés (noms de pages/dossiers).
