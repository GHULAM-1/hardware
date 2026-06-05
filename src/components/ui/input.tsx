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
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
