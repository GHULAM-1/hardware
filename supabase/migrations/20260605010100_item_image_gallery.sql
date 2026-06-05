-- ============================================================================
-- Product image gallery
-- Items move from a single image_url to a list of images (image_urls). The first
-- element is the primary thumbnail used in lists/search. image_url is kept (now
-- unused by the app) so existing rows/readers don't break; new writes use the array.
-- ============================================================================

alter table public.items
  add column if not exists image_urls text[] not null default '{}';

-- Backfill: seed the gallery from the existing single image where present.
update public.items
  set image_urls = array[image_url]
  where image_url is not null
    and (image_urls is null or array_length(image_urls, 1) is null);
