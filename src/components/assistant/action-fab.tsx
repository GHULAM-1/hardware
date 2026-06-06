"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles, Volume2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useReadAloud } from "@/hooks/use-read-aloud";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

/**
 * The single bottom-end floating button. Tapping it opens a small speed-dial that
 * springs upward with two actions:
 *   1. Read selection — reads the currently highlighted text aloud (disabled when
 *      nothing is selected). This is the discoverable home for the read-aloud
 *      feature: the option is always there once the menu is open, so users learn
 *      "select text → tap → hear it" without hunting for a hidden gesture.
 *   2. Assistant — opens the AI chatbot (unchanged).
 *
 * Read-aloud and the assistant share this one button so the corner stays clean.
 */
export function ActionFab() {
  const { t } = useTranslation();
  const { status, play, stop } = useReadAloud();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [hasSelection, setHasSelection] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Close the menu when interacting outside it. A document listener (not a
  // full-screen overlay) is used on purpose so the page can still scroll while
  // the menu is open.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  // Track whether there's a live text selection so "Read selection" can enable.
  React.useEffect(() => {
    const onChange = () =>
      setHasSelection(Boolean(window.getSelection()?.toString().trim()));
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  // Cmd/Ctrl+J → assistant (unchanged shortcut); Esc closes the menu.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistantOpen((v) => !v);
        setMenuOpen(false);
      } else if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playing = status === "playing";
  const busy = status === "loading";
  const readLabel = playing
    ? t("common.stopReading")
    : busy
      ? t("common.reading")
      : t("common.readSelection");
  // Enabled when there's something to read, or to stop what's already playing.
  const readDisabled = !hasSelection && status === "idle";

  function onReadSelection() {
    if (status !== "idle") {
      stop();
      return;
    }
    const value = window.getSelection()?.toString().trim() ?? "";
    if (value) void play(value);
  }

  return (
    <>
      {/* The container is click-through (pointer-events-none) so its empty area —
          especially the tall region the menu pills occupy — never blocks clicks on
          content beneath it (e.g. the last table rows' action buttons). Only the
          actual buttons re-enable pointer events. */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3"
      >
        {/* Speed-dial actions (top = read selection, then assistant). */}
        <div className={cn("flex flex-col items-end gap-3", menuOpen ? "pointer-events-auto" : "pointer-events-none")}>
          <ActionPill
            open={menuOpen}
            delay={menuOpen ? 60 : 0}
            label={readLabel}
            disabled={readDisabled}
            active={playing}
            // Keep the text selection alive while tapping (mouse/touch/pen).
            onPointerDown={(e) => e.preventDefault()}
            onClick={onReadSelection}
            icon={
              busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <SpeakingBars />
              ) : (
                <Volume2 className="h-5 w-5" />
              )
            }
          />
          <ActionPill
            open={menuOpen}
            delay={0}
            label={t("assistant.title")}
            onClick={() => {
              setAssistantOpen(true);
              setMenuOpen(false);
            }}
            icon={<Sparkles className="h-5 w-5" />}
          />
        </div>

        {/* The one persistent button. */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t("common.actions")}
          aria-expanded={menuOpen}
          title={t("common.actions")}
          className={cn(
            "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform",
            "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <Plus className={cn("h-6 w-6 transition-transform duration-200", menuOpen && "rotate-45")} />
        </button>
      </div>

      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("assistant.title")}
            </DialogTitle>
          </DialogHeader>
          <AssistantPanel onNavigated={() => setAssistantOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** One speed-dial action: a labeled pill that springs up when the menu opens. */
function ActionPill({
  open,
  delay,
  label,
  icon,
  onClick,
  onPointerDown,
  disabled = false,
  active = false,
}: {
  open: boolean;
  delay: number;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "flex h-12 select-none items-center gap-2 rounded-full border px-4 text-sm font-medium shadow-md",
        "transition-all duration-200 ease-out",
        // Note: keep the disabled look as colour, NOT opacity — the open/close
        // animation drives opacity, so an opacity-based disabled style gets
        // clobbered by opacity-100 when the menu is open.
        active
          ? "border-primary bg-primary text-primary-foreground"
          : disabled
            ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
            : "border-border bg-popover text-popover-foreground hover:bg-accent hover:text-accent-foreground",
        open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** Three equalizer bars that pulse while audio plays. */
function SpeakingBars() {
  return (
    <span aria-hidden className="flex h-5 w-5 items-end justify-center gap-[2px]">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-full w-[3px] animate-pulse rounded-full bg-current motion-reduce:animate-none"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}
