"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useReminderLeadDays, useSetReminderLeadDays } from "@/hooks/use-settings";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { Language } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="max-w-2xl space-y-6">
      <PageHeader title={t("settings.title")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.reminderLeadDays")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="lead">{t("khata.reminders")}</Label>
            <Input
              id="lead"
              type="number"
              min={0}
              dir="ltr"
              className="w-32"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={!isSuperAdmin}
            />
          </div>
          {isSuperAdmin && (
            <Button onClick={onSaveLead} disabled={saveLead.isPending}>
              {t("common.save")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Language.English}>{t("settings.english")}</SelectItem>
              <SelectItem value={Language.Urdu}>{t("settings.urdu")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

    </div>
  );
}
