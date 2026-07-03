"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bell, Languages } from "lucide-react";

import { useReminderLeadDays, useSetReminderLeadDays } from "@/hooks/use-settings";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { AccountSettings } from "@/components/settings/account-settings";
import { ShortcutSettings } from "@/components/settings/shortcut-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();
  const { language, setLanguage } = useLanguage();
  const { data: lead } = useReminderLeadDays();
  const saveLead = useSetReminderLeadDays();

  const [days, setDays] = React.useState("");
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lead != null) setDays(String(lead));
  }, [lead]);

  async function onSaveLead() {
    const n = Number(days);
    if (!Number.isFinite(n) || n < 0) return;
    await saveLead.mutateAsync(n);
    toast.success(t("toast.saved"));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 sm:space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {/* Personal account — available to everyone. */}
      <AccountSettings />

      {/* Language — a per-user, client-side preference for everyone. */}
      <SettingsSection
        icon={Languages}
        title={t("settings.preferences")}
        description={t("settings.preferencesHint")}
      >
        <div className="space-y-2">
          <Label htmlFor="lang">{t("settings.language")}</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger id="lang" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Language.English}>{t("settings.english")}</SelectItem>
              <SelectItem value={Language.Urdu}>{t("settings.urdu")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      {/* Keyboard shortcuts — everyone sees theirs; super_admin edits the global set. */}
      <ShortcutSettings />

      {/* Reminders — a shop-wide setting; super_admin edits, others read-only. */}
      <SettingsSection
        icon={Bell}
        title={t("settings.reminders")}
        description={t("settings.remindersHint")}
        action={
          !isSuperAdmin ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("settings.viewOnly")}
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="lead">{t("settings.reminderLeadDays")}</Label>
            <Input
              id="lead"
              type="number"
              inputMode="numeric"
              min={0}
              dir="ltr"
              className="w-full sm:w-32"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={!isSuperAdmin}
            />
          </div>
          {isSuperAdmin && (
            <Button
              className="w-full sm:w-auto"
              onClick={onSaveLead}
              disabled={saveLead.isPending}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
