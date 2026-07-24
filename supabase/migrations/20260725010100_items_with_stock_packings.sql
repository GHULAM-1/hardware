-- ============================================================================
-- Refresh items_with_stock so it carries items.packings
--
-- The view is defined as `select i.*, …`, and Postgres expands `*` ONCE, at
-- creation time — it stores the resolved column list, not the star. So a column
-- added to `items` afterwards (packings, 20260725010000) never appears in the
-- view, and the Items / Warehouse lists that read through it would hand the item
-- detail a row with no packing styles on it.
--
-- `create or replace view` can only append columns at the end, and re-expanding
-- `i.*` inserts packings BEFORE quantity/effective_buying_price, so the view has
-- to be dropped and rebuilt. Nothing else depends on it (no dependent views,
-- no FKs), which is why the drop is safe.
--
-- REMEMBER: any future column added to `items` needs this same refresh.
-- ============================================================================

drop view if exists public.items_with_stock;

create view public.items_with_stock
with (security_invoker = on) as
  select
    i.*,
    coalesce(ws.quantity, 0) as quantity,
    coalesce(
      i.buying_price,
      (
        select se.buying_price
        from public.stock_entries se
        where se.item_id = i.id
          and se.type = 'in'
          and se.buying_price is not null
        order by se.entry_date desc, se.created_at desc
        limit 1
      )
    ) as effective_buying_price
  from public.items i
  left join public.warehouse_stock ws on ws.item_id = i.id;

comment on view public.items_with_stock is
  'Items joined with derived warehouse quantity and effective cost. Lets the Items/Warehouse list load in one round trip instead of three.';
