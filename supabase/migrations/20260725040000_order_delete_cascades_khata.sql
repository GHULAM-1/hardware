-- ============================================================================
-- Deleting a bill also deletes its khata
--
-- A partial/credit sale creates a khata (the debt it owes). khatas.order_id was
-- ON DELETE SET NULL, so deleting the order left an orphaned khata — a debt with
-- no sale behind it, which misrepresents what's actually owed. When the user
-- deletes the whole bill they mean to undo the transaction, so the debt goes
-- with it. Switch the FK to ON DELETE CASCADE.
--
-- Scope: only khatas linked to an order (order_id set) cascade. A khata entered
-- by hand (order_id null) is independent and untouched. order_items /
-- order_item_suppliers already cascade from orders; no stock is involved (sales
-- never auto-deduct stock — see 0700_create_order_rpc), so nothing to restore.
-- ============================================================================

alter table public.khatas
  drop constraint if exists khatas_order_id_fkey;

alter table public.khatas
  add constraint khatas_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete cascade;
