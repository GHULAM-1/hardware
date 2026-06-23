-- ============================================================================
-- 20260622 — Phase 1: split Items vs Warehouse
-- Items are now created in their own "Items" catalog screen. Stock in/out lives
-- in the Warehouse screen and is only available once an item is opted-in here.
-- Toggling this off never deletes stock entries — the last derived quantity is
-- still shown; the item just drops out of the warehouse management screen.
-- ============================================================================

alter table public.items
  add column track_in_warehouse boolean not null default false;

comment on column public.items.track_in_warehouse is
  'When true, the item appears in the Warehouse screen with stock in/out controls. '
  'When false, stock entries are preserved (quantity stays derived) but hidden from management.';
