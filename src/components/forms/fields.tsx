"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { ImageUpload } from "@/components/common/image-upload";
import { MultiImageUpload } from "@/components/common/multi-image-upload";
import type { ImageFolder } from "@/lib/storage";

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

/**
 * Pakistani phone field: digits-only, local format (03XXXXXXXXX, max 11). Strips
 * non-digits live so `+92`/spaces can't be entered; the schema enforces the format.
 */
export function PhoneField<T extends FieldValues>({
  control,
  name,
  label,
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
              type="tel"
              dir="ltr"
              inputMode="numeric"
              maxLength={11}
              placeholder="03001234567"
              {...field}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Pakistani CNIC field: digits-only (max 13), shown live as 35201-1234567-1 but
 * stored RAW (13 digits) in form state so the schema/unique-index stay simple.
 */
export function CnicField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
}: BaseProps<T>) {
  const formatCnicDisplay = (digits: string) => {
    const p1 = digits.slice(0, 5);
    const p2 = digits.slice(5, 12);
    const p3 = digits.slice(12, 13);
    return [p1, p2, p3].filter(Boolean).join("-");
  };
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const raw = ((field.value as string | null) ?? "").replace(/\D/g, "").slice(0, 13);
        return (
          <FormItem>
            <Labelled label={label} optional={optional} />
            <FormControl>
              <Input
                type="text"
                dir="ltr"
                inputMode="numeric"
                placeholder="35201-1234567-1"
                value={formatCnicDisplay(raw)}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 13))}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  optional,
  hint,
  step = 1,
  min = 0,
  integer = false,
}: BaseProps<T> & { step?: number | string; min?: number; integer?: boolean; hint?: string }) {
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
              // Prices/quantities are never negative, so min defaults to 0 and we
              // block the keys that would let a user type a negative/exponent.
              // `integer` additionally blocks the decimal point (whole values only).
              min={min}
              step={integer ? 1 : step}
              inputMode={integer ? "numeric" : undefined}
              onKeyDown={
                integer
                  ? (e) => {
                      if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                    }
                  : undefined
              }
              dir="ltr"
              placeholder={placeholder}
              {...field}
              value={(field.value as string | number | null) ?? ""}
            />
          </FormControl>
          {hint ? <FormDescription>{hint}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** RHF-wired on/off toggle: label (+ optional hint) on the left, shadcn Switch on the right. */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {hint ? <FormDescription>{hint}</FormDescription> : null}
          </div>
          <FormControl>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </FormControl>
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
  voice = false,
}: BaseProps<T> & { voice?: boolean }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const current = (field.value as string | null) ?? "";
        return (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <Labelled label={label} optional={optional} />
              {voice ? (
                <VoiceInputButton
                  onText={(text) => field.onChange(current ? `${current} ${text}` : text)}
                />
              ) : null}
            </div>
            <FormControl>
              <Textarea placeholder={placeholder} {...field} value={current} />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** RHF-wired image upload bound to an `image_url` field. */
export function ImageField<T extends FieldValues>({
  control,
  name,
  label,
  folder,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  folder: ImageFolder;
}) {
  const { t } = useTranslation();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
          </FormLabel>
          <FormControl>
            <ImageUpload
              value={(field.value as string | null) ?? null}
              onChange={(url) => field.onChange(url)}
              folder={folder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** RHF-wired multi-image (gallery) upload bound to a string[] `image_urls` field. */
export function ImagesField<T extends FieldValues>({
  control,
  name,
  label,
  folder,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  folder: ImageFolder;
}) {
  const { t } = useTranslation();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            <span className="ms-1 text-muted-foreground">({t("common.optional")})</span>
          </FormLabel>
          <FormControl>
            <MultiImageUpload
              value={(field.value as string[] | null) ?? []}
              onChange={(urls) => field.onChange(urls)}
              folder={folder}
            />
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
