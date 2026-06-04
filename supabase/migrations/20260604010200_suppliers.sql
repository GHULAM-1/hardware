-- ============================================================================
-- 0200 — Suppliers
-- Used by the warehouse (sourcing) and by order lines (which supplier a sale
-- is drawn from). Created on the fly via the "+" type-ahead in the UI.
-- ============================================================================

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index suppliers_name_idx on public.suppliers using gin (to_tsvector('simple', name));

create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

select public.apply_standard_rls('public.suppliers');
