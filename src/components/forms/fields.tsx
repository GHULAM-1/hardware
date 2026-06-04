"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Reusable react-hook-form fields wired to shadcn FormMessage (zod errors render
 * inline). Used by every form so validation/markup stays consistent and DRY.
 */

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  optional?: boolean;
};

function Labelled({ label, optional }: { label: string; optional?: boolean }) {
  const { t } = useTranslation();
  return (
    <FormLabel>
      {label}
      {optional ? <span className="ms-1 text-muted-foreground">({t("common.optional")})</span> : null}
    </FormLabel>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  dir,
  optional,
  type = "text",
}: BaseProps<T> & { type?: "text" | "email" | "password" }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Labelled label={label} optional={optional} />
          <FormControl>
            <Input
              type={type}
              dir={dir}
              placeholder={placeholder}
              {...field}
              value={(field.value as string | null) ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  optional,
}: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Labelled label={label} optional={optional} />
          <FormControl>
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              placeholder={placeholder}
              {...field}
              value={(field.value as string | number | null) ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  optional,
}: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Labelled label={label} optional={optional} />
          <FormControl>
            <Textarea placeholder={placeholder} {...field} value={(field.value as string | null) ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Paired English + Urdu name fields (Module 7), RHF-wired. */
export function BilingualNameFields<T extends FieldValues>({
  control,
  enName,
  urName,
}: {
  control: Control<T>;
  enName: FieldPath<T>;
  urName: FieldPath<T>;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField control={control} name={enName} label={t("fields.nameEn")} dir="ltr" />
      <FormField
        control={control}
        name={urName}
        render={({ field }) => (
          <FormItem>
            <Labelled label={t("fields.nameUr")} optional />
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
