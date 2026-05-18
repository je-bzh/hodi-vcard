-- ============================================================================
-- Hodi vCard — Migration 0005 : table wallpapers (fonds d'écran QR)
-- ============================================================================
-- Une vCard peut avoir jusqu'à 6 fonds d'écran téléchargés / composés
-- (bg uploadé par l'utilisateur + QR code overlay, généré client-side puis
-- uploadé sur Storage `vcard-images` sous {user_id}/wallpaper-{ts}.png).
--
-- Réutilise le bucket Storage `vcard-images` (déjà créé en 0004).
-- Quand la vCard est supprimée → cascade sur les wallpapers (DB).
-- Les fichiers Storage sont supprimés par le JS (`onDelete`) car Postgres
-- ne sait pas piloter Storage.
-- ============================================================================

create table if not exists public.wallpapers (
	id          uuid primary key default gen_random_uuid(),
	vcard_id    uuid not null references public.vcards(id) on delete cascade,
	image_url   text not null,
	storage_path text not null, -- pour pouvoir supprimer le fichier Storage à la suppression
	created_at  timestamptz not null default now()
);

create index if not exists wallpapers_vcard_id_idx on public.wallpapers(vcard_id);

-- ----------------------------------------------------------------------------
-- Trigger : limite à 6 wallpapers par vCard
-- ----------------------------------------------------------------------------
create or replace function public.wallpapers_enforce_limit()
returns trigger language plpgsql as $$
declare
	cnt integer;
begin
	select count(*) into cnt from public.wallpapers where vcard_id = new.vcard_id;
	if cnt >= 6 then
		raise exception 'WALLPAPERS_LIMIT: maximum 6 wallpapers per vCard';
	end if;
	return new;
end;
$$;

drop trigger if exists wallpapers_limit_trigger on public.wallpapers;
create trigger wallpapers_limit_trigger
	before insert on public.wallpapers
	for each row execute function public.wallpapers_enforce_limit();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.wallpapers enable row level security;

-- Lecture : owner uniquement (les wallpapers ne sont pas affichés publiquement,
-- l'utilisateur les télécharge depuis son espace authentifié)
drop policy if exists "wallpapers_owner_select" on public.wallpapers;
create policy "wallpapers_owner_select"
	on public.wallpapers for select
	to authenticated
	using (
		exists (select 1 from public.vcards v
		        where v.id = wallpapers.vcard_id
		          and v.user_id = auth.uid())
	);

-- Insert : owner de la vcard uniquement
drop policy if exists "wallpapers_owner_insert" on public.wallpapers;
create policy "wallpapers_owner_insert"
	on public.wallpapers for insert
	to authenticated
	with check (
		exists (select 1 from public.vcards v
		        where v.id = wallpapers.vcard_id
		          and v.user_id = auth.uid())
	);

-- Delete : owner de la vcard uniquement
drop policy if exists "wallpapers_owner_delete" on public.wallpapers;
create policy "wallpapers_owner_delete"
	on public.wallpapers for delete
	to authenticated
	using (
		exists (select 1 from public.vcards v
		        where v.id = wallpapers.vcard_id
		          and v.user_id = auth.uid())
	);
