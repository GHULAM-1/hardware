"use client";

import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Search } from "lucide-react";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useItemNameSuggestions } from "@/hooks/use-items";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { ItemInput } from "@/lib/schemas";

/**
 * Item name inputs (English + Urdu), with live suggestions on the English name.
 *
 * As the admin types, existing items with a matching name drop down beneath the
 * field — so a new "Paint Box 6" can follow the naming of the "Paint Box 5"
 * that's already there, and an accidental repeat is obvious before saving. On an
 * EXACT name clash the field turns into an error (mirroring the DB's unique
 * index) so the two item dialogs can block submit; the constraint is still the
 * final gate. Separated from the shared BilingualNameFields because that one is
 * also used by customers, which have no such rule.
 */
export function ItemNameFields({ excludeId }: { excludeId?: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { control, clearErrors } = useFormContext<ItemInput>();

  const nameEn = (useWatch({ control, name: "name_en" }) as string) ?? "";
  const { suggestions, isDuplicate } = useItemNameSuggestions(nameEn, excludeId);

  const [focused, setFocused] = React.useState(false);
  // The list is shown whenever the focused field has matches, EXCEPT after the
  // user dismisses it (Esc / pick / click-away). Deriving `showList` this way —
  // rather than storing an `open` flag synced by an effect — keeps a single
  // source of truth and avoids a setState-in-effect cascade. Typing clears the
  // dismissal so fresh matches reappear.
  const [dismissed, setDismissed] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const showList = focused && !dismissed && suggestions.length > 0;

  // Click-away dismisses (blur alone fires before a suggestion's click lands).
  React.useEffect(() => {
    if (!showList) return;
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setDismissed(true);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showList]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="name_en"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.nameEn")}</FormLabel>
            <FormControl>
              <div ref={boxRef} className="relative">
                <Input
                  dir="ltr"
                  autoComplete="off"
                  {...field}
                  value={(field.value as string | null) ?? ""}
                  onChange={(e) => {
                    setDismissed(false); // typing brings the list back
                    // Drop a stale duplicate error pinned on a previous submit;
                    // the live isDuplicate warning takes over while typing.
                    clearErrors("name_en");
                    field.onChange(e);
                  }}
                  aria-invalid={isDuplicate || undefined}
                  className={cn(isDuplicate && "border-destructive focus-visible:ring-destructive")}
                  onFocus={() => {
                    setFocused(true);
                    setDismissed(false);
                  }}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && showList) {
                      e.preventDefault();
                      setDismissed(true);
                    }
                  }}
                />
                {showList && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-white/25 bg-popover shadow-lg">
                    <p className="flex items-center gap-1.5 border-b border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Search className="h-3 w-3" />
                      {t("items.existingMatches")}
                    </p>
                    <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
                      {suggestions.slice(0, 8).map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            // Fill the name so the admin can tweak it (e.g. bump the
                            // number). If they leave it identical, the dup guard fires.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              field.onChange(s.name_en);
                              setDismissed(true);
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-start text-sm transition hover:bg-white/10"
                          >
                            <span className="min-w-0 truncate font-semibold">
                              {displayName(s, language)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
                              {s.sku}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </FormControl>
            {/* Exact clash: a clear inline warning in place of the generic message. */}
            {isDuplicate ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {t("items.duplicateName")}
              </p>
            ) : (
              <FormMessage />
            )}
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="name_ur"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("fields.nameUr")}
              <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
            </FormLabel>
            <FormControl>
              <Input
                dir="rtl"
                className="font-[family-name:var(--font-urdu)]"
                {...field}
                value={(field.value as string | null) ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
