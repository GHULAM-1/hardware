"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TextField } from "@/components/forms/fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/enums";
import { userSchema, type UserValues } from "@/lib/schemas";
import { useCreateUser } from "@/hooks/use-users";

export function UserFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateUser();

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { full_name: "", email: "", password: "", role: UserRole.Admin },
  });

  async function onSubmit(values: UserValues) {
    try {
      await create.mutateAsync(values);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={t("users.newUser")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={create.isPending}
        submitLabel={t("common.create")}
      >
        <div className="space-y-4">
          <TextField control={form.control} name="full_name" label={t("fields.name")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="email" label={t("auth.email")} type="email" dir="ltr" />
            <TextField control={form.control} name="password" label={t("auth.password")} type="password" dir="ltr" />
          </div>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.role")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserRole.Admin}>{t("roles.admin")}</SelectItem>
                    <SelectItem value={UserRole.SuperAdmin}>{t("roles.super_admin")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormDialog>
    </Form>
  );
}
