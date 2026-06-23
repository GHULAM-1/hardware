"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  CnicField,
  ImageField,
  NumberField,
  PhoneField,
  TextField,
  TextareaField,
} from "@/components/forms/fields";
import { DatePicker } from "@/components/common/date-picker";
import { staffSchema, type StaffValues } from "@/lib/schemas";
import { todayLocalISO } from "@/lib/format";
import { useCreateStaff, useUpdateStaff } from "@/hooks/use-staff";
import { DUPLICATE_CNIC, DUPLICATE_PHONE } from "@/lib/errors";
import type { Staff } from "@/types/models";

export type StaffFormPayload = { staff?: Staff } | null;

export function StaffFormDialog({ payload, onClose }: DialogComponentProps<StaffFormPayload>) {
  const { t } = useTranslation();
  const staff = payload?.staff;
  const isEdit = Boolean(staff);

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: staff?.name ?? "",
      phone: staff?.phone ?? "",
      cnic: staff?.cnic ?? "",
      address: staff?.address ?? "",
      image_url: staff?.image_url ?? null,
      monthly_salary: staff?.monthly_salary ?? ("" as unknown as number),
      joined_on: staff?.joined_on ?? todayLocalISO(),
      is_active: staff?.is_active ?? true,
    },
  });

  const create = useCreateStaff();
  const update = useUpdateStaff();
  const submitting = create.isPending || update.isPending;

  async function onSubmit(values: StaffValues) {
    try {
      if (isEdit && staff) await update.mutateAsync({ id: staff.id, values });
      else await create.mutateAsync(values);
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === DUPLICATE_PHONE) toast.error(t("staff.duplicatePhone"));
      else if (msg === DUPLICATE_CNIC) toast.error(t("staff.duplicateCnic"));
      else toast.error(msg || t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={isEdit ? t("staff.editStaff") : t("staff.newStaff")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={submitting}
      >
        <div className="space-y-4">
          <TextField control={form.control} name="name" label={t("staff.staffName")} />
          <PhoneField control={form.control} name="phone" label={t("fields.phone")} />
          <CnicField control={form.control} name="cnic" label={t("staff.cnic")} optional />
          <NumberField
            control={form.control}
            name="monthly_salary"
            label={t("staff.monthlySalary")}
            integer
          />
          <FormField
            control={form.control}
            name="joined_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("staff.joinedOn")}</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <p className="text-xs text-muted-foreground">{t("staff.joinedOnHint")}</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextareaField control={form.control} name="address" label={t("fields.address")} optional />
          <ImageField control={form.control} name="image_url" label={t("staff.photo")} folder="staff" />

          {isEdit ? (
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <FormLabel className="text-sm font-medium">{t("staff.active")}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : null}
        </div>
      </FormDialog>
    </Form>
  );
}
