/**
 * Make an overflow container scrollable with the arrow keys.
 *
 * A plain `overflow-y-auto` div is not focusable, so clicking inside one leaves
 * focus on the page body. The browser scrolls the nearest scrollable ancestor of
 * the FOCUSED element — and the body is an ancestor of the container, not a
 * descendant, so Up/Down/PageDown do nothing. Inside a dialog it's worse: the
 * body is scroll-locked, so the keys are silently dead.
 *
 * Putting the container itself in the tab order fixes it: a click anywhere in it
 * now lands focus on the container (the browser focuses the nearest focusable
 * ancestor), and the arrows scroll it. `role="region"` + a name is what ARIA
 * expects once a scroll area is a tab stop, so it announces itself instead of
 * being an unlabelled one.
 */
export function scrollRegionProps(label: string) {
  return { tabIndex: 0, role: "region" as const, "aria-label": label };
}

/**
 * Companion classes: no outline for the mouse click that focuses the region,
 * but a real ring when it's reached by keyboard, so tabbing stays visible.
 */
export const scrollRegionClass = "outline-none focus-visible:ring-2 focus-visible:ring-ring";
