-- ============================================================================
-- 0800 — Module 6: AI assistant embeddings (Supabase VectorDB)
-- Powers the hybrid voice/text assistant. pgvector stores one embedding per item
-- (built from its bilingual name + sku + category) so the assistant can resolve
-- fuzzy / Urdu-spoken item references by semantic similarity. Structured facts
-- (orders, stock, khata) are fetched by the assistant's tools, not from here.
-- ============================================================================

create extension if not exists "vector";   -- pgvector: embeddings & similarity

-- One embedding per item. 1536 dims — both providers are pinned to 1536
-- (OpenAI text-embedding-3-small / Google gemini-embedding-001) so this column
-- is provider-agnostic. Re-embed (scripts/embed-items.mjs) after switching.
create table public.item_embeddings (
  item_id    uuid primary key references public.items (id) on delete cascade,
  content    text not null,             -- the text that was embedded (for debugging / re-embed)
  embedding  vector(1536) not null,
  updated_at timestamptz not null default now()
);

-- HNSW cosine index — recommended for semantic search.
create index item_embeddings_embedding_idx
  on public.item_embeddings using hnsw (embedding vector_cosine_ops);

create trigger trg_item_embeddings_updated_at
  before update on public.item_embeddings
  for each row execute function public.set_updated_at();

-- Active users read, super_admin writes (writes happen via the service-role
-- backfill script, which bypasses RLS anyway).
select public.apply_standard_rls('public.item_embeddings');

-- ---------------------------------------------------------------------------
-- Semantic item search. SECURITY INVOKER so it runs under the caller's RLS —
-- the assistant only ever sees what the logged-in user is allowed to see.
-- ---------------------------------------------------------------------------
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
  select i.id, i.sku, i.name_en, i.name_ur, i.unit, i.selling_price,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.item_embeddings e
  join public.items i on i.id = e.item_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
