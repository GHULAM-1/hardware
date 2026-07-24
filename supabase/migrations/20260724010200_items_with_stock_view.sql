-- One round trip for the Items / Warehouse list.
--
-- listItemsWithStock used to issue THREE sequential queries — items, then
-- warehouse_stock, then a scan of stock_entries for the latest priced stock-in —
-- and stitch them together in JS. Against a database ~250ms away that is ~750ms
-- of pure latency to render a handful of rows, and the DB itself answers each in
-- well under a millisecond.
--
-- This view does the join in Postgres so the app makes a single call. Cost comes
-- from items.buying_price (added in 20260724010000) with the old latest-stock-in
-- lookup kept as a fallback for legacy rows whose column is still null.
--
-- security_invoker = on: the view executes as the CALLING user, so the existing
-- RLS policies on items / stock_entries still apply. Without it the view would
-- run as its owner and leak rows past RLS.

create or replace view public.items_with_stock
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
