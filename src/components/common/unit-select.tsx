"use client";

import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNITS } from "@/lib/units";

/**
 * Unit picker (pcs, kg, liter, …). Fixed list, so a shadcn Select. The stored
 * value is the canonical key; the label is localized (English / Urdu).
 */
export function UnitSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNITS.map((u) => (
          <SelectItem key={u} value={u}>
            {t(`units.${u}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
