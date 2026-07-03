"use client";

import * as React from "react";

/** Controls whose own arrow/page-key behaviour must not be hijacked for scrolling. */
const KEY_CONSUMER_ROLES = new Set([
  "menu",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "listbox",
  "option",
  "combobox",
  "slider",
  "spinbutton",
  "tab",
  "tablist",
  "radio",
  "radiogroup",
  "tree",
  "treeitem",
  "grid",
  "gridcell",
]);

function isKeyConsumer(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  const role = target.getAttribute("role");
  if (role && KEY_CONSUMER_ROLES.has(role)) return true;
  // Inside an open Radix popper (dropdown/select/popover) — it manages arrow keys
  // itself. Dialogs are intentionally NOT here: they are scroll targets.
  if (target.closest('[data-radix-popper-content-wrapper],[role="menu"],[role="listbox"]')) {
    return true;
  }
  return false;
}

function isScrollableY(el: HTMLElement): boolean {
  const oy = getComputedStyle(el).overflowY;
  return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
}

/** First scrollable element walking up from `from`, stopping after `boundary`. */
function ascendScrollable(from: Element | null, boundary: Element): HTMLElement | null {
  let el: Element | null = from;
  while (el instanceof HTMLElement) {
    if (isScrollableY(el)) return el;
    if (el === boundary) break;
    el = el.parentElement;
  }
  return null;
}

/** First scrollable element at/under `root` (breadth-agnostic; first match wins). */
function descendScrollable(root: HTMLElement): HTMLElement | null {
  if (isScrollableY(root)) return root;
  for (const n of root.querySelectorAll<HTMLElement>("*")) {
    if (isScrollableY(n)) return n;
  }
  return null;
}

/**
 * Picks the scroll region the keys should act on: the topmost open dialog/sheet
 * if one is up (its content, or a scrollable child), otherwise the nearest
 * scrollable ancestor of whatever's focused, falling back to the main content.
 */
function resolveScrollTarget(fallback: HTMLElement | null): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  // Radix unmounts closed dialogs, so any present one is open. Last = topmost.
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]');
  const dialog = dialogs.length ? dialogs[dialogs.length - 1] : null;
  if (dialog) {
    const start = active && dialog.contains(active) ? active : dialog;
    return ascendScrollable(start, dialog) ?? descendScrollable(dialog);
  }
  return ascendScrollable(active, document.body) ?? fallback;
}

/**
 * Makes the keyboard scroll the *right* region — Arrow up/down, PageUp/Down,
 * Home/End — even though the app scrolls inner elements (fixed shell) and opens
 * modal detail views rather than scrolling the page. Attach the returned ref to
 * the main content scroller; dialogs/sheets and nested scroll areas are detected
 * automatically.
 *
 * Skips while typing and while a menu/select/popover owns the keys, so it never
 * fights native behaviour. Same keys on Windows and macOS.
 */
export function useArrowScroll<T extends HTMLElement>() {
  const fallbackRef = React.useRef<T>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Modifier combos are shortcuts (e.g. Ctrl+letter nav), not scrolling.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isKeyConsumer(e.target)) return;

      const el = resolveScrollTarget(fallbackRef.current);
      if (!el || el.scrollHeight <= el.clientHeight) return;

      const line = 64;
      const page = el.clientHeight * 0.9;

      switch (e.key) {
        case "ArrowDown":
          el.scrollBy({ top: line });
          break;
        case "ArrowUp":
          el.scrollBy({ top: -line });
          break;
        case "PageDown":
          el.scrollBy({ top: page });
          break;
        case "PageUp":
          el.scrollBy({ top: -page });
          break;
        case "Home":
          el.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "End":
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          break;
        default:
          return;
      }
      e.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return fallbackRef;
}
