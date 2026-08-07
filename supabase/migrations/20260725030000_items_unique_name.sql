-- ============================================================================
-- No two items with the same name
--
-- Enforce a case-insensitive, whitespace-trimmed uniqueness on the English item
-- name, so "Paint Box 5", "paint box 5" and " paint box 5 " can't all coexist.
-- The app also guards this live while typing (a suggestion dropdown + inline
-- warning), but the DB is the source of truth: a race between two tabs, an import
-- or a direct write still can't create a duplicate.
--
-- Scope note: only name_en (required, the primary label). name_ur is optional and
-- frequently blank, and many NULLs are fine in a unique index, so it is left
-- unconstrained on purpose.
--
-- Verified before shipping: `select lower(btrim(name_en)) ... group by 1 having
-- count(*) > 1` returned zero rows across all 124 items, so the index builds.
-- ============================================================================

create unique index if not exists items_name_en_norm_uidx
  on public.items (lower(btrim(name_en)));

comment on index public.items_name_en_norm_uidx is
  'Case-insensitive, trimmed uniqueness on item name_en. Violation → SQLSTATE 23505, surfaced to the user as "an item with this name already exists".';
