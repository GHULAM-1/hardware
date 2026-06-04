-- ============================================================================
-- 0000 — Extensions, enums & shared helpers
-- Hardware Shop CRM
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "unaccent";    -- accent-insensitive search

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role        as enum ('super_admin', 'admin');
create type public.stock_entry_type as enum ('in', 'out');
create type public.payment_type     as enum ('cash', 'partial', 'credit');
create type public.order_status     as enum ('draft', 'completed', 'cancelled');
create type public.khata_status     as enum ('pending', 'fulfilled');

-- ---------------------------------------------------------------------------
-- updated_at touch trigger, reused by every mutable table
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;