import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border-0 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      // Colored badges use the small-ledge candy recipe; status colors carry meaning.
      variant: {
        default: "candy candy-sm candy-blue text-white",
        secondary: "bg-secondary text-secondary-foreground",
        success: "candy candy-sm candy-green text-white",
        warning: "candy candy-sm candy-orange text-white",
        destructive: "candy candy-sm candy-red text-white",
        purple: "candy candy-sm candy-purple text-white",
        outline: "border border-border bg-card text-foreground",
        ghost: "text-foreground [a&]:hover:bg-accent",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
