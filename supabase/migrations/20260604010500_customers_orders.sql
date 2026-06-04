-- ============================================================================
-- 0500 — Module 3: Customers, Orders & Receipts
-- A receipt IS an order (order-only; no standalone receipts). The receipt total
-- always uses the actual sold price entered on each line.
--
-- Per line the user picks one or more suppliers to source from (informational —
-- stock is subtracted manually in the warehouse). The buying price shown is a
-- read-only snapshot; the selling price defaults from the item but is editable.
-- ============================================================================

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  -- Bilingual name (Module 7).
  name_en     text not null,
  name_ur     text,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customers_name_en_trgm on public.customers using gin (to_tsvector('simple', name_en));
create index customers_name_ur_idx  on public.customers using gin (to_tsvector('simple', coalesce(name_ur, '')));
create index customers_phone_idx    on public.customers (phone);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Order number: ORD-000001, ...
create sequence public.order_no_seq;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique
                  default ('ORD-' || lpad(nextval('public.order_no_seq')::text, 6, '0')),
  customer_id   uuid not null references public.customers (id) on delete restrict,
  payment_type  public.payment_type not null default 'cash',
  status        public.order_status not null default 'completed',
  total         numeric(12,2) not null default 0 check (total >= 0),
  -- cash: amount_paid = total | credit: 0 | partial: whatever was paid now
  amount_paid   numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due   numeric(12,2) generated always as (total - amount_paid) stored,
  due_date      date,                       -- when remaining is due (partial/credit)
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id);
create index orders_created_idx  on public.orders (created_at desc);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  item_id       uuid not null references public.items (id) on delete restrict,
  quantity      numeric(12,2) not null check (quantity > 0),
  unit          text not null default 'pcs',
  selling_price numeric(12,2) not null check (selling_price >= 0),   -- actual sold price (editable)
  line_total    numeric(12,2) generated always as (quantity * selling_price) stored,
  created_at    timestamptz not null default now()
);

create index order_items_order_idx    on public.order_items (order_id);
-- Supports "last selling price to THIS customer for THIS item" lookups.
create index order_items_item_idx     on public.order_items (item_id);

-- A single order line may be sourced across multiple suppliers.
-- Purely a record of intent — no stock is deducted automatically.
create table public.order_item_suppliers (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references public.order_items (id) on delete cascade,
  supplier_id    uuid references public.suppliers (id) on delete set null,
  quantity       numeric(12,2) not null check (quantity > 0),
  buying_price   numeric(12,2) check (buying_price >= 0),   -- read-only snapshot from sourcing
  created_at     timestamptz not null default now()
);

create index order_item_suppliers_line_idx on public.order_item_suppliers (order_item_id);

select public.apply_standard_rls('public.customers');
select public.apply_standard_rls('public.orders');
select public.apply_standard_rls('public.order_items');
select public.apply_standard_rls('public.order_item_suppliers');
