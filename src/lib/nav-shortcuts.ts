import { NAV_ITEMS } from "@/lib/nav";

/** href → single uppercase letter for its Ctrl+letter launcher. */
export type ShortcutMap = Record<string, string>;

/**
 * Letters the browser reserves at the Ctrl level and won't let us intercept
 * (Ctrl+T new tab, Ctrl+N new window, Ctrl+W close tab). The recorder refuses
 * these so a user can't bind a shortcut that will never fire.
 */
export const RESERVED_SHORTCUT_LETTERS = new Set(["T", "N", "W"]);

/**
 * Shortcut targets that fire an action (open a dialog) instead of navigating to
 * a route. They're keyed like an href so they flow through the exact same store,
 * settings editor and uniqueness validation — only the launcher tells them apart
 * (route → navigate, action key → run the action). Quick search is the only one.
 */
export const QUICK_SEARCH_KEY = "action:quick-search";

/** Default letters for the action shortcuts (kept unique against NAV_ITEMS). */
const ACTION_SHORTCUT_DEFAULTS: ShortcutMap = {
  [QUICK_SEARCH_KEY]: "K",
};

/** The code defaults — the letter each shortcut target ships with. */
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  ...Object.fromEntries(NAV_ITEMS.map((i) => [i.href, i.shortcut])),
  ...ACTION_SHORTCUT_DEFAULTS,
};

/**
 * A single configurable shortcut target — a nav route or an action — so the
 * settings editor rows and label lookups treat routes and actions uniformly.
 */
export type ShortcutEntry = { key: string; i18nKey: string; adminAllowed: boolean };

export const SHORTCUT_ENTRIES: ShortcutEntry[] = [
  ...NAV_ITEMS.map((i) => ({
    key: i.href,
    i18nKey: i.i18nKey,
    adminAllowed: Boolean(i.adminAllowed),
  })),
  // Quick search is an item/customer/order lookup — available to admins too.
  { key: QUICK_SEARCH_KEY, i18nKey: "quickSearch.title", adminAllowed: true },
];

/** Coerce raw input to a single A–Z uppercase letter, or null if it isn't one. */
export function normalizeShortcut(input: string): string | null {
  const c = input.trim().toUpperCase();
  return /^[A-Z]$/.test(c) ? c : null;
}

/** First A–Z letter that's neither already taken nor browser-reserved. */
function firstFreeLetter(taken: Set<string>): string {
  for (let i = 65; i <= 90; i++) {
    const c = String.fromCharCode(i);
    if (!taken.has(c) && !RESERVED_SHORTCUT_LETTERS.has(c)) return c;
  }
  return "?"; // unreachable: 26 letters ≫ number of targets.
}

/**
 * Merge stored overrides onto the code defaults → the effective letter per target.
 * The result is ALWAYS conflict-free: every target gets a distinct, valid, non-
 * reserved letter — even when the stored data predates a newly added shortcut and
 * still holds a letter that a new target now defaults to (which is exactly how
 * Khata's old "K" and Quick search's new "K" could otherwise both survive).
 *
 * When two targets want the same letter, the one whose CODE DEFAULT is that letter
 * keeps it; the other falls back to its own default, then to the first free letter.
 * Invalid/reserved stored letters are ignored so a stale value can't blank a key.
 */
export function resolveShortcuts(overrides: ShortcutMap | null | undefined): ShortcutMap {
  const keys = Object.keys(DEFAULT_SHORTCUTS);

  // What each target would like: a valid, non-reserved override, else its default.
  const desired: ShortcutMap = {};
  for (const href of keys) {
    const n = overrides ? normalizeShortcut(overrides[href] ?? "") : null;
    desired[href] = n && !RESERVED_SHORTCUT_LETTERS.has(n) ? n : DEFAULT_SHORTCUTS[href];
  }

  // Place targets claiming their OWN default first, so they win a contested letter
  // over a target that merely borrowed it via a stale/legacy override.
  const ordered = [...keys].sort(
    (a, b) =>
      (desired[a] === DEFAULT_SHORTCUTS[a] ? 0 : 1) -
      (desired[b] === DEFAULT_SHORTCUTS[b] ? 0 : 1),
  );

  const out: ShortcutMap = {};
  const taken = new Set<string>();
  for (const href of ordered) {
    let letter = desired[href];
    if (taken.has(letter)) letter = DEFAULT_SHORTCUTS[href]; // fall back to own default
    if (taken.has(letter) || RESERVED_SHORTCUT_LETTERS.has(letter)) {
      letter = firstFreeLetter(taken);
    }
    out[href] = letter;
    taken.add(letter);
  }
  return out;
}

/**
 * Why `letter` can't be assigned to `href` given the current effective `map`,
 * or null if it's allowed. `duplicate` is the hard rule: no *other* route may
 * already own the same letter.
 */
export function shortcutConflict(
  map: ShortcutMap,
  href: string,
  letter: string,
): "invalid" | "reserved" | "duplicate" | null {
  const c = normalizeShortcut(letter);
  if (!c) return "invalid";
  if (RESERVED_SHORTCUT_LETTERS.has(c)) return "reserved";
  const clash = Object.entries(map).some(([h, l]) => h !== href && l === c);
  return clash ? "duplicate" : null;
}

/**
 * Whole-map integrity check — every letter valid, non-reserved, and unique.
 * The final gate before persisting: a map that fails this must never be stored.
 */
export function validateShortcutMap(map: ShortcutMap): boolean {
  const seen = new Set<string>();
  for (const letter of Object.values(map)) {
    const c = normalizeShortcut(letter);
    if (!c || RESERVED_SHORTCUT_LETTERS.has(c) || seen.has(c)) return false;
    seen.add(c);
  }
  return true;
}
