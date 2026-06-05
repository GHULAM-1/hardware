-- ============================================================================
-- Supplier phone is the unique key
-- The business has no email; phone identifies a supplier. Enforce uniqueness at
-- the DB level as a race-safe backstop to the app-layer pre-check. Partial index
-- so multiple suppliers may still have NULL phone (phone stays optional).
-- ============================================================================

create unique index if not exists suppliers_phone_unique
  on public.suppliers (phone)
  where phone is not null;
