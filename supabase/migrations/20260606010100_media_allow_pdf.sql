-- ============================================================================
-- 0606 — Allow PDF uploads in the media bucket (for supplier bills)
-- Supplier bills may be a photo OR a PDF, so add application/pdf and raise the
-- size cap to 10MB. Image uploads stay client-validated to 5MB / image types.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'],
    file_size_limit = 10485760
where id = 'media';
