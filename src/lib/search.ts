/**
 * Tokenize a user's search box text into normalized words for matching against
 * the `search_norm` column (see migration 20260606010300_item_search_norm).
 *
 * Each token is lowercased and stripped of spaces + punctuation — the SAME
 * normalization the database applies to the column — so "50 kg", "50kg" and
 * "50-kg" all collapse to "50kg". The caller ANDs every token together, which
 * also makes word order irrelevant ("50kg cement" finds "Cement Bag 50kg").
 *
 * Urdu letters and digits are kept (only whitespace/punctuation is removed).
 * `%` is dropped defensively so a token can never inject an ilike wildcard.
 */
export function searchTokens(raw: string, max = 8): string[] {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[\s\p{P}%]/gu, ""))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Relevance score for a normalized row against a normalized query phrase, LOWER
 * is more relevant. Mirrors the SQL ranking in search_items_ranked so every
 * search feels the same:
 *   - the phrase's position in the row (a PREFIX match beats a mid-string one;
 *     a scattered match where the words aren't contiguous sorts last), then
 *   - shorter text (closer to an exact match).
 * Returns 0 for an empty query so callers can skip re-ordering entirely.
 */
export function relevanceScore(norm: string | null | undefined, queryPhrase: string): number {
  if (!queryPhrase) return 0;
  const hay = norm ?? "";
  const at = hay.indexOf(queryPhrase); // 0-based; -1 when not contiguous
  const position = at < 0 ? 1_000_000 : at + 1;
  // Blend position (dominant) with length as a tiebreak, without a second sort key.
  return position * 100_000 + hay.length;
}

/**
 * Stable relevance re-ordering of an already-fetched page of rows. Used by the
 * entity searches (customers, suppliers, staff) that rank in JS rather than via a
 * dedicated SQL function — their result pages are small, so sorting the fetched
 * rows is enough to float the exact match to the top. Items use the stronger
 * DB-side search_items_ranked instead (ranking BEFORE the limit).
 *
 * NOTE: this reorders within the fetched page only; it can't surface a match the
 * query's LIMIT already excluded.
 */
export function rankBySearch<T>(
  rows: T[],
  search: string,
  getNorm: (row: T) => string | null | undefined,
): T[] {
  const phrase = searchTokens(search).join("");
  if (!phrase) return rows;
  // Decorate-sort-undecorate keeps it stable (equal scores keep DB order) and
  // avoids recomputing the score inside the comparator.
  return rows
    .map((row, i) => ({ row, i, score: relevanceScore(getNorm(row), phrase) }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((d) => d.row);
}
