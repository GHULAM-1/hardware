-- ============================================================================
-- 0400 — Module 5: Warehouse Inventory
-- Same items as the catalog. Here the user records sourcing: quantities and the
-- supplier each batch came from, with its buying price.
--
-- IMPORTANT: the system NEVER auto-subtracts stock. Quantity changes ONLY when
-- the user records an entry manually. There are no order-deduction triggers.
--   type 'in'  -> stock received (usually has a supplier + buying_price)
--   type 'out' -> manual subtraction (sale, damage, adjustment) — needs a note
-- ============================================================================

create table public.stock_entries (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items (id) on delete cascade,
  supplier_id  uuid references public.suppliers (id) on delete set null,
  type         public.stock_entry_type not null,
  quantity     numeric(12,2) not null check (quantity > 0),   -- always positive; sign comes from type
  buying_price numeric(12,2) check (buying_price >= 0),        -- per-supplier cost, on 'in'
  note         text,                                           -- reason on 'out'
  entry_date   date not null default current_date,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index stock_entries_item_idx     on public.stock_entries (item_id);
create index stock_entries_supplier_idx on public.stock_entries (supplier_id);

create trigger trg_stock_entries_updated_at
  before update on public.stock_entries
  for each row execute function public.set_updated_at();

-- Current warehouse quantity per item = Σ(in) − Σ(out). Derived, never stored.
create view public.warehouse_stock as
  select
    i.id as item_id,
    coalesce(sum(case when se.type = 'in'  then se.quantity else 0 end), 0) as total_in,
    coalesce(sum(case when se.type = 'out' then se.quantity else 0 end), 0) as total_out,
    coalesce(sum(case when se.type = 'in'  then se.quantity
                      else -se.quantity end), 0) as quantity
  from public.items i
  left join public.stock_entries se on se.item_id = i.id
  group by i.id;

select public.apply_standard_rls('public.stock_entries');
