-- ============================================================================
-- 0300 — Module 2: Catalog & Pricing
-- The "pricing" screen. One shared item list (also surfaced in the warehouse).
-- Pricing tracks the SELLING price only — never quantities, never suppliers.
-- All prices are PKR.
-- ============================================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- System-generated SKU: SKU-000001, SKU-000002, ...
create sequence public.sku_seq;

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references public.categories (id) on delete set null,
  sku           text not null unique
                  default ('SKU-' || lpad(nextval('public.sku_seq')::text, 6, '0')),
  -- Bilingual name (Module 7). name_en required; name_ur optional.
  name_en       text not null,
  name_ur       text,
  unit          text not null default 'pcs',     -- pcs, kg, m, ...
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  image_url     text,                            -- optional
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Deep real-time search across English + Urdu names and SKU.
create index items_name_en_trgm on public.items using gin (to_tsvector('simple', name_en));
create index items_name_ur_idx  on public.items using gin (to_tsvector('simple', coalesce(name_ur, '')));
create index items_sku_idx      on public.items (sku);
create index items_category_idx on public.items (category_id);

create trigger trg_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

select public.apply_standard_rls('public.categories');
select public.apply_standard_rls('public.items');
