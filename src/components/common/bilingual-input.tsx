"use client";

import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Paired English + Urdu name fields (Module 7). Used by item & customer forms.
 * Urdu field renders RTL with the Nastaliq face; English stays LTR.
 */
export function BilingualInput({
  idPrefix,
  valueEn,
  valueUr,
  onChangeEn,
  onChangeUr,
  required = true,
}: {
  idPrefix: string;
  valueEn: string;
  valueUr: string;
  onChangeEn: (v: string) => void;
  onChangeUr: (v: string) => void;
  required?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-en`}>{t("fields.nameEn")}</Label>
        <Input
          id={`${idPrefix}-en`}
          dir="ltr"
          required={required}
          value={valueEn}
          onChange={(e) => onChangeEn(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ur`}>
          {t("fields.nameUr")} <span className="text-muted-foreground">({t("common.optional")})</span>
        </Label>
        <Input
          id={`${idPrefix}-ur`}
          dir="rtl"
          className="font-[family-name:var(--font-urdu)]"
          value={valueUr}
          onChange={(e) => onChangeUr(e.target.value)}
        />
      </div>
    </div>
  );
}
