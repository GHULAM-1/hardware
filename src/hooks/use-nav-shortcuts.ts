"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
import { DEFAULT_SHORTCUTS } from "@/lib/nav-shortcuts";
import { useNavShortcutSettings } from "@/hooks/use-settings";
import { useIsSuperAdmin } from "@/providers/auth-provider";

/** Elements where a keystroke means "type", not "navigate" — never hijack there. */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Binds the global "Ctrl + letter" launcher shortcuts (same on Windows and Mac —
 * the physical Control key). Active app-wide so a user can jump between sections
 * from any page. Respects the admin permission filter, stays out of the way while
 * typing, and never steals Ctrl+C when there's a text selection to copy.
 */
export function useNavShortcuts() {
  const router = useRouter();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: shortcuts } = useNavShortcutSettings();

  // Keep the latest permission flag and the (user-customizable) shortcut map in
  // refs so the listener isn't re-bound on every auth/settings change — and so
  // the handler always reads the current values. Falls back to code defaults
  // until the stored map has loaded. Synced in an effect (never mutated during
  // render) so the single keydown listener below stays mounted.
  const canAllRef = React.useRef(isSuperAdmin);
  const mapRef = React.useRef(DEFAULT_SHORTCUTS);
  React.useEffect(() => {
    canAllRef.current = isSuperAdmin;
    mapRef.current = shortcuts ?? DEFAULT_SHORTCUTS;
  });

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Pure Ctrl+letter only — no Alt/Shift/Meta, so we don't clash with Cmd
      // shortcuts on Mac or Ctrl+Shift/Ctrl+Alt combos.
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const href = Object.keys(mapRef.current).find(
        (h) => mapRef.current[h].toLowerCase() === key,
      );
      if (!href) return;
      const item = NAV_ITEMS.find((i) => i.href === href);
      if (!item || !(canAllRef.current || item.adminAllowed)) return;

      // Preserve real copy: if Ctrl+C is pressed while text is selected, let the
      // browser copy instead of navigating.
      if (key === "c") {
        const sel = window.getSelection?.();
        if (sel && !sel.isCollapsed && sel.toString().length > 0) return;
      }

      e.preventDefault();
      e.stopPropagation();
      router.push(item.href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
