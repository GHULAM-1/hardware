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
        "inline-flex h-10 items-center gap-2 rounded-lg border-2 border-white/25 bg-white/15 px-3 text-sm font-bold text-white backdrop-blur-sm",
        "transition-colors hover:bg-white/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      <span>{language === Language.Urdu ? "EN" : "اردو"}</span>
    </button>
  );
}
