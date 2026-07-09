-- Normalized search for customers, suppliers and staff.
--
-- Brings these tables up to the same fast, typo-tolerant search that items already
-- use (see migration 20260606010300_item_search_norm): a generated `search_norm`
-- column folds the human-readable fields into a single lowercase string with all
-- spaces/punctuation removed (Urdu letters preserved — only [:space:]/[:punct:] are
-- stripped), and the app tokenizes the query and ANDs each normalized word against
-- it via `ilike '%token%'`. A trigram GIN index keeps those lookups fast.
--
-- `search_norm` is GENERATED ALWAYS ... STORED, so Postgres keeps it in sync on every
-- insert/update and backfills existing rows automatically — no app/trigger code needed.

create extension if not exists pg_trgm with schema extensions;

-- Customers — bilingual name + phone.
alter table public.customers
  add column if not exists search_norm text
  generated always as (
    lower(
      regexp_replace(
        coalesce(name_en, '') || ' ' || coalesce(name_ur, '') || ' ' || coalesce(phone, ''),
        '[[:space:][:punct:]]+', '', 'g'
      )
    )
  ) stored;

create index if not exists customers_search_norm_trgm
  on public.customers using gin (search_norm extensions.gin_trgm_ops);

-- Suppliers — contact name + shop name + phone.
alter table public.suppliers
  add column if not exists search_norm text
  generated always as (
    lower(
      regexp_replace(
        coalesce(name, '') || ' ' || coalesce(shop_name, '') || ' ' || coalesce(phone, ''),
        '[[:space:][:punct:]]+', '', 'g'
      )
    )
  ) stored;

create index if not exists suppliers_search_norm_trgm
  on public.suppliers using gin (search_norm extensions.gin_trgm_ops);

-- Staff — name + phone.
alter table public.staff
  add column if not exists search_norm text
  generated always as (
    lower(
      regexp_replace(
        coalesce(name, '') || ' ' || coalesce(phone, ''),
        '[[:space:][:punct:]]+', '', 'g'
      )
    )
  ) stored;

create index if not exists staff_search_norm_trgm
  on public.staff using gin (search_norm extensions.gin_trgm_ops);
