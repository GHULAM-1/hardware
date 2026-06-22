"use client"

import * as React from "react"
import { Maximize2, Minimize2, X as XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[#0a225a]/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

const winBtn =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"

/**
 * Dialog shell with a maximize/restore (resize) button + close, and **X-only
 * dismissal** — clicking the backdrop or pressing Escape does NOT close it; the
 * user must click the ✕. Maximize fills the viewport; restore returns to the
 * default size. Size resets to default each time it opens.
 *
 * Pass `plain` for non-form overlays (command palette / global search): no resize
 * chrome and normal dismissal (Esc + backdrop).
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  plain = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  plain?: boolean
}) {
  const [maximized, setMaximized] = React.useState(false)
  const isMax = !plain && maximized

  // Real dialogs close only via ✕; plain overlays keep Radix's default dismissal.
  const lockProps: Partial<React.ComponentProps<typeof DialogPrimitive.Content>> = plain
    ? {}
    : {
        onPointerDownOutside: (e) => e.preventDefault(),
        onInteractOutside: (e) => e.preventDefault(),
        onEscapeKeyDown: (e) => e.preventDefault(),
      }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-view={isMax ? "max" : "default"}
        {...lockProps}
        className={cn(
          "fixed z-50 grid gap-4 bg-card text-card-foreground shadow-[0_16px_44px_rgba(8,25,70,0.45)] outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          isMax
            ? "inset-3 overflow-y-auto rounded-2xl p-6 sm:inset-6"
            : "top-1/2 left-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-lg",
          // Caller sizing (e.g. sm:max-w-md) applies only at the default size.
          !isMax && className
        )}
        {...props}
      >
        {plain ? (
          showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              aria-label="Close"
              className={cn(winBtn, "absolute end-3 top-3 z-10 hover:bg-destructive hover:text-white")}
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )
        ) : (
          <div className="absolute end-2 top-2 z-10 flex items-center gap-0.5">
            <button
              type="button"
              aria-label={isMax ? "Restore" : "Maximize"}
              onClick={() => setMaximized((m) => !m)}
              className={winBtn}
            >
              {isMax ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                aria-label="Close"
                className={cn(winBtn, "hover:bg-destructive hover:text-white")}
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </div>
        )}

        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pe-20 text-start", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl leading-none font-extrabold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
