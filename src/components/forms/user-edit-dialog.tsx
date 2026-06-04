"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { Form } from "@/components/ui/form";
import { ImageField, TextField } from "@/components/forms/fields";
import { userUpdateSchema, type UserUpdateValues } from "@/lib/schemas";
import { useUpdateUser } from "@/hooks/use-users";
import type { Profile } from "@/types/models";

export type UserEditPayload = { user: Profile };

/** Edit a staff member: name, avatar, and an optional new password. */
export function UserEditDialog({ payload, onClose }: DialogComponentProps<UserEditPayload>) {
  const { t } = useTranslation();
  const { user } = payload;
  const update = useUpdateUser();

  const form = useForm({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      full_name: user.full_name ?? "",
      image_url: user.image_url ?? null,
      password: "",
    },
  });

  async function onSubmit(values: UserUpdateValues) {
    try {
      await update.mutateAsync({ id: user.id, values });
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <Form {...form}>
      <FormDialog
        title={t("users.editUser")}
        onClose={onClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={update.isPending}
      >
        <div className="space-y-4">
          <TextField control={form.control} name="full_name" label={t("fields.name")} />
          <ImageField control={form.control} name="image_url" label={t("fields.image")} folder="user" />
          <TextField
            control={form.control}
            name="password"
            label={t("users.newPassword")}
            type="password"
            dir="ltr"
            placeholder={t("users.passwordHint")}
            optional
          />
        </div>
      </FormDialog>
    </Form>
  );
}
