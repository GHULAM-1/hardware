-- ============================================================================
-- 0606 — Supplier orders (material request lists)
-- A list of items to request FROM a supplier (a "send me these" list, NOT a
-- money bill — no prices). Supplier is optional. Status pending → received, with
-- an optional uploaded bill (image/PDF) for records. Stock is NOT affected here;
-- stock in/out stays manual in the warehouse.
-- ============================================================================

create type public.supplier_order_status as enum ('pending', 'received');

-- Supplier order number: SO-000001, ...
create sequence public.supplier_order_no_seq;

create table public.supplier_orders (
  id           uuid primary key default gen_random_uuid(),
  order_no     text not null unique
                 default ('SO-' || lpad(nextval('public.supplier_order_no_seq')::text, 6, '0')),
  supplier_id  uuid references public.suppliers (id) on delete set null,   -- optional
  status       public.supplier_order_status not null default 'pending',
  note         text,
  bill_url     text,                       -- supplier's bill (image/PDF), set on receive
  received_at  timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index supplier_orders_supplier_idx on public.supplier_orders (supplier_id);
create index supplier_orders_created_idx  on public.supplier_orders (created_at desc);

create trigger trg_supplier_orders_updated_at
  before update on public.supplier_orders
  for each row execute function public.set_updated_at();

create table public.supplier_order_items (
  id                 uuid primary key default gen_random_uuid(),
  supplier_order_id  uuid not null references public.supplier_orders (id) on delete cascade,
  item_id            uuid not null references public.items (id) on delete restrict,
  quantity           numeric(12,2) not null check (quantity > 0),
  unit               text not null default 'pcs',
  note               text,                 -- optional per-line note (brand/size)
  created_at         timestamptz not null default now()
);

create index supplier_order_items_order_idx on public.supplier_order_items (supplier_order_id);
create index supplier_order_items_item_idx  on public.supplier_order_items (item_id);

select public.apply_standard_rls('public.supplier_orders');
select public.apply_standard_rls('public.supplier_order_items');
