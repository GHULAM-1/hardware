-- Item-level buying price (cost), decoupled from stock.
--
-- Until now an item's cost was DERIVED: the most recent stock_entries row of type
-- 'in' that carried a buying_price. That made cost impossible to record without
-- also recording a purchase, because stock_entries enforces `quantity > 0` — so a
-- shopkeeper who knows what an item costs but has none in hand had nowhere to put
-- it, and the value was silently dropped on save.
--
-- Cost is now a column on items. Stock entries KEEP their own buying_price: that
-- remains the per-purchase historical record (what this delivery cost, from this
-- supplier) and still drives order cost snapshots. The item column is the current
-- cost, independent of whether any stock exists.

alter table public.items
  add column if not exists buying_price numeric(12,2) check (buying_price >= 0);

comment on column public.items.buying_price is
  'Current cost per PRIMARY unit (PKR). Independent of stock — settable with zero quantity on hand. stock_entries.buying_price remains the per-purchase history.';

-- Backfill from each item's most recent priced stock-in so existing items keep
-- showing the cost they already displayed. Only fills nulls, so re-running is safe.
update public.items i
set buying_price = s.buying_price
from (
  select distinct on (item_id) item_id, buying_price
  from public.stock_entries
  where type = 'in'
    and buying_price is not null
  order by item_id, entry_date desc, created_at desc
) s
where s.item_id = i.id
  and i.buying_price is null;
