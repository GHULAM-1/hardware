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
