"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/auth-provider";
import { userUpdateSchema, type UserUpdateValues } from "@/lib/schemas";
import { useUpdateOwnProfile } from "@/hooks/use-users";
import { PageHeader } from "@/components/layout/page-header";
import { Form } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageField, TextField } from "@/components/forms/fields";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const update = useUpdateOwnProfile();

  const form = useForm({
    resolver: zodResolver(userUpdateSchema),
    values: {
      full_name: profile?.full_name ?? "",
      image_url: profile?.image_url ?? null,
      password: "",
    },
  });

  async function onSubmit(values: UserUpdateValues) {
    try {
      await update.mutateAsync({ full_name: values.full_name, image_url: values.image_url });
      if (values.password) {
        const { error } = await supabase.auth.updateUser({ password: values.password });
        if (error) throw new Error(error.message);
      }
      await refreshProfile();
      form.resetField("password");
      toast.success(t("toast.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
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
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {t("profile.save")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
