-- ============================================================================
-- Hodi vCard — Migration 0004 : bucket Storage pour les images
-- ============================================================================
-- - Bucket public "vcard-images" (avatar, cover, wallpapers)
-- - Convention de chemin : {user_id}/{type}.{ext}
--     ex. d8b9f12a-.../avatar.png, d8b9f12a-.../cover.jpg
-- - Lecture publique, écriture réservée au propriétaire (user_id dans le path)
-- ============================================================================

-- Création du bucket s'il n'existe pas
insert into storage.buckets (id, name, public)
values ('vcard-images', 'vcard-images', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- POLICIES sur storage.objects (scope: bucket_id = 'vcard-images')
-- ----------------------------------------------------------------------------

-- Lecture publique (tout le monde peut voir les images affichées sur les vCards)
drop policy if exists "vcard_images_public_read" on storage.objects;
create policy "vcard_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'vcard-images');

-- Upload : utilisateur authentifié peut uploader dans son propre dossier
drop policy if exists "vcard_images_owner_insert" on storage.objects;
create policy "vcard_images_owner_insert"
on storage.objects for insert
to authenticated
with check (
	bucket_id = 'vcard-images'
	and auth.uid()::text = (storage.foldername(name))[1]
);

-- Update : idem (upsert)
drop policy if exists "vcard_images_owner_update" on storage.objects;
create policy "vcard_images_owner_update"
on storage.objects for update
to authenticated
using (
	bucket_id = 'vcard-images'
	and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
	bucket_id = 'vcard-images'
	and auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete : suppression de ses propres images
drop policy if exists "vcard_images_owner_delete" on storage.objects;
create policy "vcard_images_owner_delete"
on storage.objects for delete
to authenticated
using (
	bucket_id = 'vcard-images'
	and auth.uid()::text = (storage.foldername(name))[1]
);
