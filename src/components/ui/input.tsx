import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onKeyDown, ...props }: React.ComponentProps<"input">) {
  // Numeric fields in this app are never negative — block the sign/exponent keys
  // (the stepper is already clamped by `min`). Any caller onKeyDown still runs.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === "number" && ["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      onKeyDown={handleKeyDown}
      className={cn(
        // `field` = sunken well cut into the panel (see globals.css) — white bold
        // text on a deep well, the most legible pairing in a saturated scheme.
        "field h-10 w-full min-w-0 rounded-lg px-3 py-1 text-base font-bold transition-[color,box-shadow] outline-none selection:bg-gold selection:text-ink file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
