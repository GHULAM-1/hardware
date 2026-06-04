-- ============================================================================
-- 1100 — Staff avatars
-- Optional profile image for app users (staff). Stored in the same public "media"
-- bucket under the "user" folder; super-admins manage it.
-- ============================================================================

alter table public.profiles add column if not exists image_url text;
