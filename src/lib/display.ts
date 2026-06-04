import { Language } from "@/lib/enums";

/**
 * Pick the display name for a bilingual record. In Urdu mode show name_ur when
 * present, otherwise fall back to name_en. User data is shown exactly as entered.
 */
export function displayName(
  row: { name_en: string; name_ur: string | null },
  language: Language,
): string {
  if (language === Language.Urdu && row.name_ur?.trim()) return row.name_ur;
  return row.name_en;
}
