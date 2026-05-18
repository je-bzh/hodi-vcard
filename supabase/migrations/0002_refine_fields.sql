-- ============================================================================
-- Hodi vCard — Migration 0002 : raffinage des champs
-- ============================================================================
-- - Supprime birthday (plus collecté dans le formulaire)
-- - Ajoute les indicatifs téléphoniques séparés (drapeau + code pays)
-- - Ajoute la section "document" (lien + intitulé pour PDF type plaquette)
-- ============================================================================

-- Suppression du champ anniversaire
alter table public.vcards
	drop column if exists birthday;

-- Indicatifs téléphoniques (stockés séparément du numéro pour faciliter
-- l'affichage avec drapeau et permettre le changement de pays sans toucher au numéro)
alter table public.vcards
	add column if not exists phone_mobile_country text default '+33',
	add column if not exists phone_landline_country text default '+33';

-- Document à partager (plaquette PDF, brochure, etc. hébergé en externe)
alter table public.vcards
	add column if not exists document_url text,
	add column if not exists document_label text;
