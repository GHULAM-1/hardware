-- ============================================================================
-- 0600 — Module 4: Khata (Credit & Reminders) + app settings
-- Partial and full-credit orders create a Khata: an amount owed by a customer,
-- due on a date. The dashboard surfaces Khatas due within the global reminder
-- lead time (app_settings.reminder_lead_days) and lets the user mark them done.
-- ============================================================================

create table public.khatas (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete restrict,
  order_id      uuid references public.orders (id) on delete set null,  -- set when pushed from a sale
  description   text,
  amount        numeric(12,2) not null check (amount >= 0),   -- outstanding balance
  due_date      date not null,
  status        public.khata_status not null default 'pending',
  fulfilled_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index khatas_customer_idx on public.khatas (customer_id);
create index khatas_due_idx      on public.khatas (due_date) where status = 'pending';

create trigger trg_khatas_updated_at
  before update on public.khatas
  for each row execute function public.set_updated_at();

-- Keep fulfilled_at in sync with status.
create or replace function public.sync_khata_fulfilled_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'fulfilled' and new.fulfilled_at is null then
    new.fulfilled_at := now();
  elsif new.status = 'pending' then
    new.fulfilled_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_khatas_sync_fulfilled
  before insert or update on public.khatas
  for each row execute function public.sync_khata_fulfilled_at();

-- ---------------------------------------------------------------------------
-- Global app settings (key/value). Seeded with the reminder lead time.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value) values
  ('reminder_lead_days', '7'::jsonb);

select public.apply_standard_rls('public.khatas');
select public.apply_standard_rls('public.app_settings');
