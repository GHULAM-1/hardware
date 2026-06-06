"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/providers/auth-provider";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { Logo } from "@/components/layout/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { TextField } from "@/components/forms/fields";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn, session } = useAuth();

  const [error, setError] = React.useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const submitting = form.formState.isSubmitting;

  // Already signed in → go to the app. Suppressed while a sign-in is being
  // validated (signIn briefly holds a session before rejecting a disabled account),
  // so a disabled login never flashes the dashboard.
  React.useEffect(() => {
    if (session && !submitting) router.replace("/dashboard");
  }, [session, submitting, router]);

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      await signIn(values.email.trim(), values.password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "ACCOUNT_DISABLED"
          ? t("auth.accountDisabled")
          : t("auth.invalidCredentials"),
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-secondary p-4">
      <div className="absolute end-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ModeToggle />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-muted-foreground">{t("auth.welcome")}</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              <TextField
                control={form.control}
                name="email"
                label={t("auth.email")}
                type="email"
                dir="ltr"
              />
              <TextField
                control={form.control}
                name="password"
                label={t("auth.password")}
                type="password"
                dir="ltr"
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
