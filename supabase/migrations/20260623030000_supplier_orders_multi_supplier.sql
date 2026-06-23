-- ============================================================================
-- 0623 — Supplier orders: per-line supplier + per-item receiving (tally)
-- A supplier order can now mix items from several suppliers: the supplier moves
-- ONTO each line (one item ↔ one supplier). Receiving becomes a manual per-item
-- tally — the owner records how much of each line actually arrived in
-- `received_quantity`, and the order's status is derived from the lines:
--   pending  → nothing tallied yet
--   partial  → some lines tallied, but not all received in full
--   received → every line received in full
-- Stock is still NOT touched here: the owner adds received quantities into the
-- warehouse himself, exactly as before.
-- ============================================================================

-- New status for partially-received orders. (Safe inside the migration txn: the
-- value is only ever set later by the app, never used in this file.)
alter type public.supplier_order_status add value if not exists 'partial';

-- Supplier now lives on the line. Nullable (a line may be unassigned); keep the
-- line if the supplier is deleted.
alter table public.supplier_order_items
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

-- How much of this line actually arrived. NULL = not tallied yet; 0 = nothing came.
alter table public.supplier_order_items
  add column if not exists received_quantity numeric(12,2)
    check (received_quantity is null or received_quantity >= 0);

create index if not exists supplier_order_items_supplier_idx
  on public.supplier_order_items (supplier_id);
