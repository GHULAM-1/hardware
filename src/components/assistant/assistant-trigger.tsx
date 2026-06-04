"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Search, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

/**
 * The global assistant entry point in the topbar. Looks like a search box; opens
 * a dialog with the voice/text assistant. Cmd/Ctrl+K toggles it open.
 */
export function AssistantTrigger() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">{t("assistant.placeholder")}</span>
        <kbd className="ms-auto hidden rounded border border-border px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl">
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
