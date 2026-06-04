-- ============================================================================
-- 1000 — Image uploads (Supabase Storage)
-- Optional images for products (items.image_url already exists), customers and
-- suppliers. A single PUBLIC bucket "media" with per-folder paths, capped at 5MB
-- and limited to web image types. Super-admins write; anyone can read (public).
-- ============================================================================

alter table public.customers add column if not exists image_url text;
alter table public.suppliers add column if not exists image_url text;

-- Public bucket with server-enforced size + mime limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Read is public (bucket is public); writes are super-admin only, mirroring the
-- rest of the app's RLS.
drop policy if exists "media_public_read"   on storage.objects;
drop policy if exists "media_admin_insert"  on storage.objects;
drop policy if exists "media_admin_update"  on storage.objects;
drop policy if exists "media_admin_delete"  on storage.objects;

create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_super_admin());

create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_super_admin())
  with check (bucket_id = 'media' and public.is_super_admin());

create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_super_admin());
