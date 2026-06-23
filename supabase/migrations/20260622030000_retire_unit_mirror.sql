-- ============================================================================
-- 20260622 — Phase 3: retire the items.unit mirror
-- The measurement model (primary_unit / base_unit / base_per_primary) is now the
-- single source of truth. Order + supplier-order lines store their own `unit`
-- (the chosen sale/request unit), so items.unit is no longer needed.
--
-- match_items (semantic search) selected items.unit, so repoint it to
-- primary_unit first — keeping its return column named `unit` so the assistant
-- tool keeps working — then drop the column.
-- ============================================================================

create or replace function public.match_items(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id            uuid,
  sku           text,
  name_en       text,
  name_ur       text,
  unit          text,
  selling_price numeric,
  similarity    float
)
language sql
stable
security invoker
set search_path = public
as $$
  select i.id, i.sku, i.name_en, i.name_ur, i.primary_unit as unit, i.selling_price,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.item_embeddings e
  join public.items i on i.id = e.item_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.items drop column unit;
