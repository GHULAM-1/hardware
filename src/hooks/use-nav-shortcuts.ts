"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
import { DEFAULT_SHORTCUTS, QUICK_SEARCH_KEY } from "@/lib/nav-shortcuts";
import { useNavShortcutSettings } from "@/hooks/use-settings";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";

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
  const { openDialog } = useDialogManager();

  // Keep the latest permission flag, the (user-customizable) shortcut map, and
  // the dialog opener in refs so the listener isn't re-bound on every auth/
  // settings change — and so the handler always reads the current values. Falls
  // back to code defaults until the stored map has loaded. Synced in an effect
  // (never mutated during render) so the single keydown listener below stays
  // mounted.
  const canAllRef = React.useRef(isSuperAdmin);
  const mapRef = React.useRef(DEFAULT_SHORTCUTS);
  const openDialogRef = React.useRef(openDialog);
  React.useEffect(() => {
    canAllRef.current = isSuperAdmin;
    mapRef.current = shortcuts ?? DEFAULT_SHORTCUTS;
    openDialogRef.current = openDialog;
  });

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Pure Ctrl+letter only — no Alt/Shift/Meta, so we don't clash with Cmd
      // shortcuts on Mac or Ctrl+Shift/Ctrl+Alt combos.
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const target = Object.keys(mapRef.current).find(
        (h) => mapRef.current[h].toLowerCase() === key,
      );
      if (!target) return;

      // Preserve real copy: if Ctrl+C is pressed while text is selected, let the
      // browser copy instead of firing a shortcut.
      if (key === "c") {
        const sel = window.getSelection?.();
        if (sel && !sel.isCollapsed && sel.toString().length > 0) return;
      }

      // Action shortcut: open the Quick search dialog (available to admins too).
      if (target === QUICK_SEARCH_KEY) {
        e.preventDefault();
        e.stopPropagation();
        openDialogRef.current(DialogKey.ItemQuickSearch, null);
        return;
      }

      // Route shortcut: navigate, subject to the admin permission filter.
      const item = NAV_ITEMS.find((i) => i.href === target);
      if (!item || !(canAllRef.current || item.adminAllowed)) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(item.href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
