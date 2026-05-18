-- ============================================================================
-- Hodi vCard — Migration 0003 : flux de création ouvert
-- ============================================================================
-- - Une seule vCard par owner_email (contrainte unique, case-insensitive)
-- - RPC public.email_has_vcard() : check de dispo, appelable par anon
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nettoyage : supprime les doublons par owner_email (garde le plus récent)
-- ----------------------------------------------------------------------------
delete from public.vcards a
using public.vcards b
where a.id < b.id
  and lower(a.owner_email) = lower(b.owner_email);

-- ----------------------------------------------------------------------------
-- 2. Index unique case-insensitive sur owner_email
-- ----------------------------------------------------------------------------
drop index if exists vcards_owner_email_lower_idx;
create unique index vcards_owner_email_lower_idx
  on public.vcards (lower(owner_email));

-- ----------------------------------------------------------------------------
-- 3. RPC : vérifie si un email a déjà une vCard
-- ----------------------------------------------------------------------------
create or replace function public.email_has_vcard(p_email text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.vcards
    where lower(owner_email) = lower(p_email)
  );
$$;

grant execute on function public.email_has_vcard(text) to anon, authenticated;
