"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

/**
 * Floating entry point for the AI assistant — the familiar bottom-end chat
 * bubble, kept visually and functionally separate from the global search box in
 * the topbar. Cmd/Ctrl+J toggles it. The dialog reuses the existing
 * AssistantPanel (voice + chat) unchanged.
 */
export function AssistantFab() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("assistant.title")}
        title={t("assistant.title")}
        className={cn(
          // Bottom-end, safe-area aware, above app content but below modals.
          "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-30",
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("assistant.title")}
            </DialogTitle>
          </DialogHeader>
          <AssistantPanel onNavigated={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
