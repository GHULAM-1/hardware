-- ============================================================================
-- Customer blacklist flag
-- A non-blocking warning marker: when a blacklisted customer is selected on an
-- order the admin is warned, but billing is never prevented. Standard customer
-- RLS already governs reads/writes — no new policy needed.
-- ============================================================================

alter table public.customers
  add column is_blacklisted boolean not null default false;

comment on column public.customers.is_blacklisted is
  'Warn (not block) when this customer is selected on an order.';
