-- ============================================================================
-- Hodi vCard — Schéma MySQL / MariaDB (remplace Supabase/Postgres)
-- ============================================================================
-- Création : mysql -uroot -proot < db/schema.sql
--
-- Choix de design :
--   - UUID applicatifs en CHAR(36) (générés en PHP) → conserve la convention
--     de chemin Storage {user_id}/fichier.png et les liens publics par slug.
--   - Collation utf8mb4_unicode_ci : comparaisons case-insensitive par défaut,
--     donc UNIQUE(slug) / UNIQUE(email) sont déjà insensibles à la casse
--     (équivalent des index lower() de la version Postgres).
--   - Sécurité : aucune "RLS" ici — l'autorisation est faite côté PHP
--     (l'API ne renvoie jamais owner_email/user_id en public, force
--      owner_email = email de session, vérifie la propriété sur update/delete).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hodi_vcard
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;

USE hodi_vcard;

-- ----------------------------------------------------------------------------
-- users — identités (l'email est l'identifiant, comme Supabase Auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
	id          CHAR(36)     NOT NULL PRIMARY KEY,
	email       VARCHAR(255) NOT NULL,
	created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- auth_tokens — jetons de magic-link (usage unique, courte durée)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
	id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
	user_id     CHAR(36)     NOT NULL,
	token_hash  CHAR(64)     NOT NULL,           -- sha256 du jeton (jamais stocké en clair)
	redirect    VARCHAR(255) NOT NULL DEFAULT 'mes-infos.html',
	expires_at  DATETIME     NOT NULL,
	used_at     DATETIME     NULL,
	created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY auth_tokens_hash_unique (token_hash),
	KEY auth_tokens_user_idx (user_id),
	CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- sessions — sessions navigateur (cookie HttpOnly → token_hash)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
	id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
	user_id     CHAR(36)     NOT NULL,
	token_hash  CHAR(64)     NOT NULL,
	expires_at  DATETIME     NOT NULL,
	created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY sessions_hash_unique (token_hash),
	KEY sessions_user_idx (user_id),
	CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- vcards — la carte (miroir du schéma Supabase)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vcards (
	id                      CHAR(36)     NOT NULL PRIMARY KEY,
	slug                    VARCHAR(50)  NOT NULL,
	owner_email             VARCHAR(255) NOT NULL,   -- email du compte (PRIVÉ : jamais exposé publiquement)
	user_id                 CHAR(36)     NULL,

	first_name              VARCHAR(120) NOT NULL,
	last_name               VARCHAR(120) NOT NULL,
	company                 VARCHAR(190) NULL,
	role                    VARCHAR(190) NULL,

	phone_mobile            VARCHAR(40)  NULL,
	phone_mobile_country    VARCHAR(8)   NULL DEFAULT '+33',
	phone_landline          VARCHAR(40)  NULL,
	phone_landline_country  VARCHAR(8)   NULL DEFAULT '+33',
	email_public            VARCHAR(255) NULL,        -- email de contact AFFICHÉ (optionnel, choisi par l'utilisateur)
	website_url             VARCHAR(500) NULL,
	booking_url             VARCHAR(500) NULL,
	address                 VARCHAR(500) NULL,
	document_url            VARCHAR(500) NULL,
	document_label          VARCHAR(190) NULL,

	socials                 LONGTEXT     NOT NULL,    -- JSON { "linkedin": "...", "whatsapp_enabled": true, ... }
	cover_url               VARCHAR(500) NULL,
	avatar_url              VARCHAR(500) NULL,

	rgpd_consented_at       DATETIME     NULL,
	created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	UNIQUE KEY vcards_slug_unique (slug),
	UNIQUE KEY vcards_owner_email_unique (owner_email),
	KEY vcards_user_idx (user_id),
	CONSTRAINT vcards_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- wallpapers — fonds d'écran QR (1 défaut Hodi + perso)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallpapers (
	id            CHAR(36)     NOT NULL PRIMARY KEY,
	vcard_id      CHAR(36)     NOT NULL,
	image_url     VARCHAR(500) NOT NULL,
	storage_path  VARCHAR(500) NOT NULL,
	is_default    TINYINT(1)   NOT NULL DEFAULT 0,
	created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	KEY wallpapers_vcard_idx (vcard_id),
	CONSTRAINT wallpapers_vcard_fk FOREIGN KEY (vcard_id) REFERENCES vcards(id) ON DELETE CASCADE
) ENGINE=InnoDB;
