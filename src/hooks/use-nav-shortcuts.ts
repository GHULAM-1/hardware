"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
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

  // Keep the latest permission flag in a ref so the listener isn't re-bound on
  // every auth change (and so the handler always reads the current value).
  const canAllRef = React.useRef(isSuperAdmin);
  canAllRef.current = isSuperAdmin;

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Pure Ctrl+letter only — no Alt/Shift/Meta, so we don't clash with Cmd
      // shortcuts on Mac or Ctrl+Shift/Ctrl+Alt combos.
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const item = NAV_ITEMS.find(
        (i) => i.shortcut.toLowerCase() === key && (canAllRef.current || i.adminAllowed),
      );
      if (!item) return;

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
