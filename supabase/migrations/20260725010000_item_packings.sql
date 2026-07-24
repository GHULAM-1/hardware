-- ============================================================================
-- Packing styles per item
--
-- One item is stocked in several pack sizes: 1 box = 12 pencils, 1 carton = 60,
-- 1 crate = 200. The admin needs to name each pack freely and say how many
-- PRIMARY units it holds, so the item detail can price a whole pack
-- (qty x selling_price).
--
-- Stored as jsonb on `items` rather than a child table, deliberately:
--   * the list is tiny (a handful of rows) and is ALWAYS read with its item,
--   * every existing read path (`select *`, items_with_stock, global search)
--     picks it up for free — no extra round trip, and this app is latency-bound
--     (see 20260724010200_items_with_stock_view.sql),
--   * it is written atomically with the item, so no orphan rows on failure.
-- The trade-off is no per-row FK/query support, which nothing here needs:
-- packings are descriptive, they never take part in stock or order maths.
--
-- Shape: [{ "label": "Box", "qty": 12 }, ...]  — qty is in PRIMARY units.
-- ============================================================================

-- CHECK constraints can't contain a subquery, and jsonb_array_elements is
-- set-returning, so the shape test lives in an immutable helper instead.
create or replace function public.is_valid_packings(p jsonb)
returns boolean
language sql
immutable
as $$
  select p is null or (
    jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) <= 20
    and (
      select coalesce(
        bool_and(
          jsonb_typeof(e) = 'object'
          and jsonb_typeof(e -> 'label') = 'string'
          and length(btrim(e ->> 'label')) between 1 and 40
          and jsonb_typeof(e -> 'qty') = 'number'
          and (e ->> 'qty')::numeric > 0
        ),
        true   -- an empty array has nothing to reject
      )
      from jsonb_array_elements(p) e
    )
  );
$$;

comment on function public.is_valid_packings(jsonb) is
  'True when the value is an array of {label:string(1..40), qty:number>0} objects (max 20).';

alter table public.items
  add column if not exists packings jsonb not null default '[]'::jsonb;

alter table public.items
  drop constraint if exists items_packings_shape;

alter table public.items
  add constraint items_packings_shape check (public.is_valid_packings(packings));

comment on column public.items.packings is
  'Packing styles: [{label, qty}] where qty is how many PRIMARY units the pack holds.';
