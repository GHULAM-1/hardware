"use client";

import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { DEFAULT_SHORTCUTS, QUICK_SEARCH_KEY } from "@/lib/nav-shortcuts";
import { useNavShortcutSettings } from "@/hooks/use-settings";
import { ShortcutHint } from "@/components/layout/shortcut-hint";

/**
 * The top-bar search box — the app's single search entry point.
 *
 * It used to render its own command palette over the very same
 * items/customers/orders/staff query that Quick search runs, so the app carried
 * two overlapping searches: this compact one, and a richer two-pane dialog that
 * was only reachable from a tile on the Dashboard. This is now just the trigger;
 * both it and the keyboard shortcut open `ItemQuickSearch`, which previews the
 * selected result inline instead of bouncing the user into a second dialog.
 *
 * Voice input moved into that dialog with the rest of the palette.
 */
export function GlobalSearch() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  // Same source the dashboard tile reads, so a re-bound key stays in step here.
  const { data: shortcuts } = useNavShortcutSettings();
  const letter = shortcuts?.[QUICK_SEARCH_KEY] ?? DEFAULT_SHORTCUTS[QUICK_SEARCH_KEY];

  return (
    <button
      type="button"
      onClick={() => openDialog(DialogKey.ItemQuickSearch, null)}
      aria-label={t("globalSearch.placeholder")}
      className={cn(
        "field flex h-9 items-center gap-2 rounded-lg text-sm font-semibold text-white/75 transition-colors hover:text-white",
        // Full box from sm up; a compact icon button on mobile.
        "w-9 justify-center sm:w-full sm:justify-start sm:px-3",
      )}
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="hidden truncate sm:inline">{t("globalSearch.placeholder")}</span>
      {/* Key badge, so the shortcut is discoverable from the box itself. */}
      <ShortcutHint letter={letter} className="ms-auto hidden shrink-0 sm:inline-flex" />
    </button>
  );
}
