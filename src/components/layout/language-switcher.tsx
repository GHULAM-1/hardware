"use client";

import { Languages } from "lucide-react";

import { Language } from "@/lib/enums";
import { useLanguage } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/** Toggle between English and Urdu (flips UI direction to RTL for Urdu). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const next = language === Language.Urdu ? Language.English : Language.Urdu;

  return (
    <button
      type="button"
      aria-label="Toggle language"
      onClick={() => setLanguage(next)}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      <span>{language === Language.Urdu ? "EN" : "اردو"}</span>
    </button>
  );
}
