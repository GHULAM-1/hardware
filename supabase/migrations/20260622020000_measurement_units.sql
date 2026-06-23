-- ============================================================================
-- 20260622 — Phase 2: measurement & unit model
-- Items now declare how they're measured (count / weight / length) and store
-- quantity in a canonical BASE unit (piece / gram / mm). The admin works in a
-- PRIMARY unit (box / kg / foot…); base_per_primary converts between them.
--
--   selling_price   → now means price per PRIMARY unit (per box / kg / foot)
--   stock_entries.quantity     → stored in BASE units
--   stock_entries.buying_price → price per PRIMARY unit (latest wins)
--
-- `unit` is kept as a mirror of primary_unit so the order/supplier flows that
-- copy it onto their lines keep working until Phase 3 migrates them.
-- ============================================================================

create type public.measurement_type as enum ('count', 'weight', 'length');

alter table public.items
  add column measurement_type   public.measurement_type not null default 'count',
  add column primary_unit       text          not null default 'piece',
  add column base_unit          text          not null default 'piece',
  add column base_per_primary   numeric(12,4) not null default 1 check (base_per_primary > 0),
  -- Reorder level, expressed in PRIMARY units. Null = no low-stock flag.
  add column low_stock_threshold numeric(12,2) check (low_stock_threshold >= 0);

-- Backfill existing rows (no production data): preserve any free-text unit as the
-- primary unit, treat everything as a simple count with factor 1.
update public.items
  set primary_unit = coalesce(nullif(unit, ''), 'piece'),
      base_unit    = coalesce(nullif(unit, ''), 'piece');

comment on column public.items.selling_price is 'Selling price per PRIMARY unit (PKR).';
comment on column public.items.base_per_primary is 'Canonical base units in one primary unit (piece/gram/mm).';
comment on column public.items.low_stock_threshold is 'Reorder level in PRIMARY units; null = no low-stock flag.';
comment on column public.stock_entries.quantity is 'Quantity in canonical BASE units.';
comment on column public.stock_entries.buying_price is 'Buying price per PRIMARY unit (latest entry wins).';
