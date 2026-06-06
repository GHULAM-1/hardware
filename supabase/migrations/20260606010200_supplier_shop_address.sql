-- ============================================================================
-- 0606 — Suppliers: add shop name + address
-- A supplier now records a contact/supplier name, the business (shop) name, and
-- an address (alongside the existing required phone). The old image/note are no
-- longer used by the app (columns kept to avoid a destructive drop).
-- ============================================================================

alter table public.suppliers add column if not exists shop_name text;
alter table public.suppliers add column if not exists address   text;
