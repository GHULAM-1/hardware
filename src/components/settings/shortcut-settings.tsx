"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { NAV_ITEMS } from "@/lib/nav";
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcut,
  shortcutConflict,
  type ShortcutMap,
} from "@/lib/nav-shortcuts";
import {
  useNavShortcutSettings,
  useSetNavShortcutSettings,
} from "@/hooks/use-settings";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { ShortcutHint } from "@/components/layout/shortcut-hint";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Keyboard } from "lucide-react";

/** Did the working map drift from the code defaults? (drives the Reset button) */
function isDirty(a: ShortcutMap, b: ShortcutMap): boolean {
  return NAV_ITEMS.some((i) => a[i.href] !== b[i.href]);
}

/**
 * Super_admin editor for the Ctrl+letter launcher keys. Editing is a "recorder":
 * click a key, press a letter — and it saves immediately (no Save button). A
 * letter already owned by another section — or one the browser reserves — is
 * rejected on the spot, so the map can never hold a combo bound to two sections.
 * Plain admins see it read-only.
 */
export function ShortcutSettings() {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: stored } = useNavShortcutSettings();
  const save = useSetNavShortcutSettings();

  const serverMap = stored ?? DEFAULT_SHORTCUTS;
  // The map shown/edited. Optimistically updated on capture, then reconciled
  // with the server's resolved result (which the mutation writes to the cache).
  const [map, setMap] = React.useState<ShortcutMap>(serverMap);
  // href currently capturing a keystroke, or null when idle.
  const [listening, setListening] = React.useState<string | null>(null);

  // Reseed from the stored map whenever it (re)loads or a save resolves.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMap(serverMap);
  }, [serverMap]);

  // Persist a whole map immediately; roll the optimistic draft back on failure.
  const persist = React.useCallback(
    async (next: ShortcutMap, previous: ShortcutMap) => {
      try {
        await save.mutateAsync(next);
        toast.success(t("toast.saved"));
      } catch {
        setMap(previous);
        toast.error(t("toast.error"));
      }
    },
    [save, t],
  );

  const nameFor = React.useCallback(
    (href: string) => {
      const item = NAV_ITEMS.find((i) => i.href === href);
      return item ? t(item.i18nKey) : href;
    },
    [t],
  );

  // Capture the next keystroke for the row being edited.
  React.useEffect(() => {
    if (!listening) return;

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setListening(null);
        return;
      }
      const letter = normalizeShortcut(e.key);
      if (!letter) {
        toast.error(t("settings.shortcutLettersOnly"));
        return; // keep listening — let them try again
      }
      const href = listening!;
      const conflict = shortcutConflict(map, href, letter);
      if (conflict === "reserved") {
        toast.error(t("settings.shortcutReserved", { letter }));
        return;
      }
      if (conflict === "duplicate") {
        const owner = Object.keys(map).find((h) => map[h] === letter);
        toast.error(t("settings.shortcutTaken", { letter, name: nameFor(owner!) }));
        return;
      }
      const next = { ...map, [href]: letter };
      setMap(next);
      setListening(null);
      void persist(next, map);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [listening, map, nameFor, persist, t]);

  // Admins see only the sections they can actually reach (matches the sidebar);
  // super_admin edits the full set. Conflict checks always use the whole `map`.
  const rows = NAV_ITEMS.filter((i) => isSuperAdmin || i.adminAllowed);

  return (
    <SettingsSection
      icon={Keyboard}
      title={t("settings.shortcuts")}
      description={t("settings.shortcutsHint")}
    >
      <div className="space-y-4">
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border">
          {rows.map((item) => {
            const listeningHere = listening === item.href;
            return (
              <li
                key={item.href}
                className="flex min-h-[3.25rem] items-center justify-between gap-3 px-3 py-2 sm:px-4"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {t(item.i18nKey)}
                </span>
                <button
                  type="button"
                  disabled={!isSuperAdmin}
                  aria-label={t("settings.changeShortcut", { name: t(item.i18nKey) })}
                  onClick={() => setListening(listeningHere ? null : item.href)}
                  className={cn(
                    "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-1 transition",
                    isSuperAdmin && "hover:bg-muted",
                    listeningHere && "bg-muted ring-2 ring-ring",
                    !isSuperAdmin && "cursor-default",
                  )}
                >
                  {listeningHere ? (
                    <span className="inline-flex items-center rounded-md border border-dashed px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      {t("settings.pressKey")}
                    </span>
                  ) : (
                    <ShortcutHint letter={map[item.href]} className="bg-black/70" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {isSuperAdmin && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              const prev = map;
              setMap(DEFAULT_SHORTCUTS);
              void persist(DEFAULT_SHORTCUTS, prev);
            }}
            disabled={save.isPending || !isDirty(DEFAULT_SHORTCUTS, map)}
          >
            {t("settings.resetDefaults")}
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
