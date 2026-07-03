"use client";

import * as React from "react";

import { cn, isMac } from "@/lib/utils";

/**
 * A "Ctrl + X" key badge for nav items. The modifier is resolved after mount
 * (SSR always renders "Ctrl", so first client render matches — no hydration
 * mismatch), then upgrades to the "⌃" glyph on macOS. Windows/Linux keep "Ctrl".
 */
export function ShortcutHint({ letter, className }: { letter: string; className?: string }) {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => setMac(isMac()), []);
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none inline-flex items-center rounded-md bg-black/20 px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-wide text-white/90 shadow-sm",
        className,
      )}
    >
      {mac ? `⌃${letter}` : `Ctrl+${letter}`}
    </span>
  );
}
