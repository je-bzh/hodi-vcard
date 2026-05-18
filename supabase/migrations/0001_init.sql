-- ============================================================================
-- Hodi vCard — Schéma initial
-- ============================================================================
-- Migration 0001 : tables vcards et wallpapers + RLS + triggers
-- Exécuter depuis le SQL editor Supabase (ou via la CLI).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE : vcards
-- ----------------------------------------------------------------------------
create table if not exists public.vcards (
	id                  uuid primary key default gen_random_uuid(),

	-- Identifiant publique de la vcard (URL : hodi.live/vcard/{slug})
	slug                text not null unique
		check (slug ~ '^[a-z0-9-]+$' and length(slug) between 3 and 50),

	-- Email du propriétaire — sert à recevoir les magic links de modification.
	-- Doit correspondre à l'email d'un user Supabase Auth.
	owner_email         text not null,

	-- Lien vers auth.users — renseigné lors de la création par l'utilisateur authentifié.
	user_id             uuid references auth.users(id) on delete set null,

	-- Identité
	first_name          text not null,
	last_name           text not null,
	company             text,
	role                text,

	-- Contact
	phone_mobile        text,
	phone_landline      text,
	email_public        text,
	website_url         text,
	booking_url         text,
	address             text,
	birthday            text,   -- text pour rester souple ("20 septembre 1979" ou "20 septembre")

	-- Réseaux sociaux (jsonb pour pouvoir ajouter de nouveaux services sans migration)
	-- Forme attendue : { "linkedin": "https://...", "instagram": "https://...", ... }
	socials             jsonb not null default '{}'::jsonb,

	-- Images (URLs Supabase Storage)
	cover_url           text,
	avatar_url          text,

	-- RGPD
	rgpd_consented_at   timestamptz not null default now(),

	-- Audit
	created_at          timestamptz not null default now(),
	updated_at          timestamptz not null default now()
);

-- Index unique en lower() pour permettre "Jerome" et "jerome" comme équivalents
create unique index if not exists vcards_slug_lower_idx
	on public.vcards (lower(slug));

-- ----------------------------------------------------------------------------
-- TABLE : wallpapers
-- ----------------------------------------------------------------------------
create table if not exists public.wallpapers (
	id                  uuid primary key default gen_random_uuid(),
	vcard_id            uuid not null references public.vcards(id) on delete cascade,

	image_url           text not null,   -- image d'origine (uploadée par l'utilisateur)
	composed_qr_url     text,            -- image finale avec le QR incrusté

	label               text,            -- nom optionnel donné par l'utilisateur
	position            smallint not null default 0,

	created_at          timestamptz not null default now()
);

create index if not exists wallpapers_vcard_idx
	on public.wallpapers(vcard_id);

-- ----------------------------------------------------------------------------
-- Trigger : updated_at automatique sur vcards
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists vcards_set_updated_at on public.vcards;

create trigger vcards_set_updated_at
	before update on public.vcards
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — vcards
-- ----------------------------------------------------------------------------
alter table public.vcards enable row level security;

-- Lecture publique : la vCard est visible par tout le monde (c'est son but)
drop policy if exists "vcards_public_read" on public.vcards;
create policy "vcards_public_read"
	on public.vcards for select
	using (true);

-- Insert : seul un user authentifié peut créer une vcard, et user_id doit être lui-même
drop policy if exists "vcards_insert_own" on public.vcards;
create policy "vcards_insert_own"
	on public.vcards for insert
	to authenticated
	with check (user_id = auth.uid());

-- Update : seul le propriétaire peut modifier
drop policy if exists "vcards_update_own" on public.vcards;
create policy "vcards_update_own"
	on public.vcards for update
	to authenticated
	using (user_id = auth.uid())
	with check (user_id = auth.uid());

-- Delete : seul le propriétaire peut supprimer
drop policy if exists "vcards_delete_own" on public.vcards;
create policy "vcards_delete_own"
	on public.vcards for delete
	to authenticated
	using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — wallpapers
-- ----------------------------------------------------------------------------
alter table public.wallpapers enable row level security;

-- Lecture publique
drop policy if exists "wallpapers_public_read" on public.wallpapers;
create policy "wallpapers_public_read"
	on public.wallpapers for select
	using (true);

-- Toutes les autres opérations : propriétaire de la vcard parente
drop policy if exists "wallpapers_manage_own" on public.wallpapers;
create policy "wallpapers_manage_own"
	on public.wallpapers for all
	to authenticated
	using (
		exists (
			select 1 from public.vcards v
			where v.id = wallpapers.vcard_id
				and v.user_id = auth.uid()
		)
	)
	with check (
		exists (
			select 1 from public.vcards v
			where v.id = wallpapers.vcard_id
				and v.user_id = auth.uid()
		)
	);

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : vérifier la dispo d'un slug
-- ----------------------------------------------------------------------------
-- Permet au client JS de tester si un slug est libre sans avoir le droit
-- d'insert. À appeler avec supabase.rpc('slug_available', { p_slug: 'jerome' }).
create or replace function public.slug_available(p_slug text)
returns boolean language sql stable as $$
	select not exists (
		select 1 from public.vcards
		where lower(slug) = lower(p_slug)
	);
$$;
