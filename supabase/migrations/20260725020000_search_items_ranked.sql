-- ============================================================================
-- Ranked item search
--
-- The item list/search filtered on search_norm but ordered by created_at, so a
-- search for "5 no lato" returned every "N no Lato Dasti" (because "5nolato" is a
-- substring of "35nolato…", "25nolato…") with the EXACT item wherever its age put
-- it — usually buried at the bottom. Worse, the LIMIT is applied to that
-- date-ordered set, so a very relevant match could be dropped entirely.
--
-- This function ranks in SQL, so the LIMIT keeps the most relevant rows. The
-- model, cheap and predictable:
--   1. phrase position — where the typed phrase appears in the name. A PREFIX
--      match (position 1) beats a mid-string match (2+); a scattered match where
--      the words aren't contiguous sorts last. This alone floats "5 no Lato
--      Dasti" above "35 no Lato Dasti" for the query "5 no lato".
--   2. shorter name — closer to an exact match, so "5 no Lato Dasti" beats a
--      longer name that merely starts the same.
--   3. newest — a stable, useful default (and the sole key when the box is empty).
--
-- Filtering keeps the existing AND-of-tokens semantics (word order irrelevant);
-- ranking uses the tokens joined back into one phrase. Tokens are pre-normalised
-- and stripped of %/_ by the app (see @/lib/search), so they can't inject a LIKE
-- wildcard; the array form is used defensively regardless.
--
-- Returns `items_with_stock` rows (the same shape the list already consumes), so
-- both the Items/Warehouse list and the global/quick search read one ranked path.
-- ============================================================================

create or replace function public.search_items_ranked(
  p_tokens text[],
  p_query  text default '',
  p_limit  int  default 100
)
returns setof public.items_with_stock
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select v.*
  from public.items_with_stock v
  where p_tokens is null
     or cardinality(p_tokens) = 0
     or v.search_norm like all (array(select '%' || t || '%' from unnest(p_tokens) t))
  order by
    -- 1) phrase position: prefix (1) < mid (2+) < absent. Neutral (0) with no
    --    query, so an empty search stays purely newest-first.
    case
      when coalesce(p_query, '') = '' then 0
      when position(p_query in v.search_norm) > 0 then position(p_query in v.search_norm)
      else 1000000
    end,
    -- 2) shorter name is closer to an exact match. Neutral with no query.
    case when coalesce(p_query, '') = '' then 0 else length(v.search_norm) end,
    -- 3) newest first — the default order, and the only active key when empty.
    v.created_at desc
  limit greatest(coalesce(p_limit, 100), 1);
$$;

comment on function public.search_items_ranked(text[], text, int) is
  'Ranked item search over items_with_stock: AND-of-tokens filter, ordered by phrase position then name length then recency, so LIMIT keeps the most relevant matches.';

grant execute on function public.search_items_ranked(text[], text, int) to anon, authenticated, service_role;
