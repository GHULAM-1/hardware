-- Normalized search for items.
--
-- Problem: a single `name ilike '%cement bag 50 kg%'` never matches the stored
-- "Cement Bag 50kg" (note the space before "kg"). We fix this two ways at once:
--   1. A generated `search_norm` column that folds name_en + name_ur + sku into a
--      single lowercase string with all spaces/punctuation removed
--      (Urdu letters are preserved — only [:space:]/[:punct:] are stripped).
--   2. The app tokenizes the query and ANDs each normalized word against this
--      column, so "50 kg" and "50kg" both reduce to the substring "50kg".
-- A trigram GIN index keeps the `ilike '%token%'` lookups fast.

create extension if not exists pg_trgm with schema extensions;

alter table public.items
  add column if not exists search_norm text
  generated always as (
    lower(
      regexp_replace(
        coalesce(name_en, '') || ' ' || coalesce(name_ur, '') || ' ' || coalesce(sku, ''),
        '[[:space:][:punct:]]+', '', 'g'
      )
    )
  ) stored;

create index if not exists items_search_norm_trgm
  on public.items using gin (search_norm extensions.gin_trgm_ops);
