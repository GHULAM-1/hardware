import { NAV_ITEMS } from "@/lib/nav";

/** href → single uppercase letter for its Ctrl+letter launcher. */
export type ShortcutMap = Record<string, string>;

/**
 * Letters the browser reserves at the Ctrl level and won't let us intercept
 * (Ctrl+T new tab, Ctrl+N new window, Ctrl+W close tab). The recorder refuses
 * these so a user can't bind a shortcut that will never fire.
 */
export const RESERVED_SHORTCUT_LETTERS = new Set(["T", "N", "W"]);

/** The code defaults — the letter each route ships with, from the nav source of truth. */
export const DEFAULT_SHORTCUTS: ShortcutMap = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.href, i.shortcut]),
);

/** Coerce raw input to a single A–Z uppercase letter, or null if it isn't one. */
export function normalizeShortcut(input: string): string | null {
  const c = input.trim().toUpperCase();
  return /^[A-Z]$/.test(c) ? c : null;
}

/**
 * Merge stored overrides onto the code defaults → the effective letter per route.
 * Only known routes are kept, and only valid letters survive; anything else falls
 * back to the default so a stale/corrupt stored value can't blank a shortcut.
 */
export function resolveShortcuts(overrides: ShortcutMap | null | undefined): ShortcutMap {
  const out: ShortcutMap = { ...DEFAULT_SHORTCUTS };
  if (overrides) {
    for (const href of Object.keys(out)) {
      const n = normalizeShortcut(overrides[href] ?? "");
      if (n) out[href] = n;
    }
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
