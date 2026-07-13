# Hodi vCard — Guide projet

Cartes de visite numériques Hodi. En ligne : **https://www.hodi.live/vcard/**

---

## Stack

Front **Vite** (HTML + partials Handlebars, SCSS via `sass-embedded`, JS vanilla)
API **PHP 8.1** dans `src/public/api/` · **MySQL/MariaDB** · mailer **PHPMailer**.

> **Supabase a été abandonné** au profit d'une API PHP + MySQL. Les résidus (dossier
> `supabase/migrations/`, section Supabase de `DEPLOY.md`) ont été supprimés.
> Il subsiste des commentaires historiques dans le code (« remplace l'ancien client
> Supabase ») — ils documentent la migration, ils sont volontaires.
> La base de vérité pour le local, c'est `SETUP-LOCAL.md`.

---

## Mise en route (local)

```bash
# Base + schéma (le script ne crée PAS la base)
mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS hodi_vcard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -uroot -proot hodi_vcard < db/schema.sql

npm install
( cd src/public/api && composer install )   # PHPMailer → vendor/
npm run build                                # → build/
```

- Local : **https://www.vcard.localhost/** (TLD `.localhost`, pas `.test`)
- Config locale : `src/public/api/config.local.php` (**gitignored**) surcharge `config.php`.
  Par défaut : `127.0.0.1` / `hodi_vcard` / `root` / `root`, uploads dans `build/uploads/`, mail driver `log`.
- Tables : `users`, `auth_tokens`, `sessions`, `vcards`, `wallpapers`.

---

## Règle d'or : ne jamais coder en dur `/vcard/`

**Un seul build** sert les deux montages :

- local → racine du domaine (`https://www.vcard.localhost/`)
- prod → sous-dossier (`https://www.hodi.live/vcard/`)

Le JS calcule sa base au runtime (`utils/urls.js` → `appBase()`) et l'API la déduit de la
requête (`app_base_url()`). Toute URL écrite en dur avec `/vcard/` casse le local, et toute
URL absolue depuis la racine casse la prod.

---

## Déploiement

```bash
npm run deploy    # = ./deploy.sh
```

Ce n'est **pas** du FTP. Le script :

1. `npm run build` → `build/`
2. crée un repo git temporaire contenant **uniquement** le contenu de `build/`
3. **force-push** ce contenu sur la branche orpheline **`deploy`** du remote `origin`
4. `main` reste propre (les sources uniquement)

Côté serveur cPanel : `cd ~/hodi-vcard && git pull` — un symlink (configuré une fois) expose
le tout dans `public_html/vcard`.

⚠️ La branche **`deploy` est force-pushée à chaque déploiement** (un seul commit, écrasé).
Ne jamais y travailler, ne jamais la merger dans `main`.

---

## Remotes — ⚠️ il y en a DEUX, à garder synchronisés

| Remote | URL | Rôle |
| --- | --- | --- |
| `github` | `git@github.com:je-bzh/hodi-vcard.git` | **Upstream de `main`** — un simple `git push` va là |
| `origin` | `buddy@eu.buddy.works:hodi/hodi---vcard` | Cible de **`deploy.sh`** (branche `deploy`) |

Branche de travail : `main`.

**Le piège :** `git push` tout court ne pousse que sur **github**. Buddy (`origin`) reste en
arrière — c'est arrivé, il avait 5 commits de retard sur `main`. Or c'est depuis Buddy qu'on
déploie. Résultat : le code source y était périmé.

**Règle : après un commit, pousser sur les deux.**

```bash
git push                # → github (upstream)
git push origin main    # → Buddy
```

---

## Outillage

- `npm run dev` — serveur Vite
- `npm run build` — build de prod dans `build/`
- `npm run tinify` — compresse les images de `src/public/assets/images/` (exige `TINIFY_API_KEY` exporté)
- husky + lint-staged + prettier + eslint sur les commits

---

## Secrets et variables d'environnement

**Le front n'a plus aucune clé.** Le `.env` (racine, gitignored) est optionnel : aucune
variable `VITE_*` n'est requise pour builder. Seul `VITE_PLAUSIBLE_ID` peut y figurer
(analytics, optionnel — et le tracking ne s'active que sur l'hôte de prod).

Tous les secrets vivent **côté serveur**, dans `src/public/api/config.local.php`
(gitignored) : accès MySQL, mailer, stockage des uploads, et la **clé Unsplash**
(`unsplash.access_key`, ou variable d'env serveur `VCARD_UNSPLASH_KEY`).

⚠️ Ne jamais remettre une clé dans une variable `VITE_*` : elle finirait **dans le bundle
public**, lisible par n'importe qui. C'est précisément ce que la migration a corrigé.
