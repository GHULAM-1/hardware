-- ============================================================================
-- 1200 — Self-service media writes
-- Any ACTIVE user may upload to the public "media" bucket (e.g. their own avatar
-- from the profile page). Attaching an image to a business record is still gated
-- at the table level (items/customers/suppliers/profiles writes = super_admin),
-- so this only lets staff manage image FILES, not business data.
-- ============================================================================

drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

create policy "media_user_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_active_user());

create policy "media_user_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_active_user())
  with check (bucket_id = 'media' and public.is_active_user());

create policy "media_user_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_active_user());
