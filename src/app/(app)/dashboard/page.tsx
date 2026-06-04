"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tag, Users, BookUser, BellPlus } from "lucide-react";

import { getAccessToken } from "@/lib/auth-token";
import { getDashboardStats } from "@/server/actions/dashboard";
import { useKhataReminders, useSetKhataStatus } from "@/hooks/use-khata";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { KhataStatus } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/common/stat-card";
import { KhataTable } from "@/components/khata/khata-table";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => getDashboardStats(await getAccessToken()),
  });
  const { data: reminders = [], isLoading } = useKhataReminders();
  const setStatus = useSetKhataStatus();

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("dashboard.totalItems")} value={stats?.items ?? "—"} icon={Tag} tone="primary" />
        <StatCard label={t("dashboard.customers")} value={stats?.customers ?? "—"} icon={Users} tone="brand" />
        <StatCard
          label={t("dashboard.pendingKhata")}
          value={stats?.pendingKhata ?? "—"}
          icon={BookUser}
          tone="warning"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("khata.reminders")}</h2>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => openDialog(DialogKey.ReminderForm, null)}>
              <BellPlus className="me-1 h-4 w-4" />
              {t("khata.newReminder")}
            </Button>
          )}
        </div>
        <KhataTable
          rows={reminders}
          loading={isLoading}
          onMarkFulfilled={(id) => setStatus.mutate({ id, status: KhataStatus.Fulfilled })}
          emptyText={t("common.noResults")}
        />
      </div>
    </div>
  );
}
