-- ============================================================================
-- Customer internal note
-- A staff-only memo about the customer (e.g. "bargains hard", "pays late"),
-- shown on the customer profile. Standard customer RLS already applies.
-- ============================================================================

alter table public.customers add column notes text;
comment on column public.customers.notes is 'Staff-only memo about the customer.';
