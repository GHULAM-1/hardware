-- ============================================================================
-- 0900 — Manual reminders
-- A manual reminder is just a khata row with NO customer (customer_id null) and
-- no money attached (amount 0): the user writes a note + a due date, and it flows
-- through the exact same reminder/lead-day logic as sale-driven khatas.
-- ============================================================================

alter table public.khatas alter column customer_id drop not null;
