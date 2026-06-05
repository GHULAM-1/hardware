"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BellPlus,
  BookUser,
  PackageX,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { getAccessToken } from "@/lib/auth-token";
import {
  getCatalogSummary,
  getFinancialSummary,
  getPaymentBreakdown,
  getRevenueTrend,
} from "@/server/actions/dashboard";
import { getKhataReminders } from "@/server/actions/khata";
import { useFulfillKhata } from "@/hooks/use-khata";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { queryKeys } from "@/lib/query-keys";
import { formatCompactPKR, formatNumber, formatPKR } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { BarChart, ChartCard, SegmentBar, type Segment } from "@/components/dashboard/charts";
import { KhataTable } from "@/components/khata/khata-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const isSuperAdmin = useIsSuperAdmin();
  const { fulfill, pendingId } = useFulfillKhata();

  // Catalog/stock health is safe for everyone; financials + reminders are
  // fetched only for super_admin so a read-only admin never pulls revenue data.
  const catalog = useQuery({
    queryKey: ["dashboard", "catalog"],
    queryFn: async () => getCatalogSummary(await getAccessToken()),
  });
  const finance = useQuery({
    queryKey: ["dashboard", "finance"],
    queryFn: async () => getFinancialSummary(await getAccessToken()),
    enabled: isSuperAdmin,
  });
  const revenue = useQuery({
    queryKey: ["dashboard", "revenue-trend"],
    queryFn: async () => getRevenueTrend(await getAccessToken(), 6),
    enabled: isSuperAdmin,
  });
  const payments = useQuery({
    queryKey: ["dashboard", "payments"],
    queryFn: async () => getPaymentBreakdown(await getAccessToken()),
    enabled: isSuperAdmin,
  });
  const reminders = useQuery({
    queryKey: queryKeys.khataReminders(),
    queryFn: async () => getKhataReminders(await getAccessToken()),
    enabled: isSuperAdmin,
  });

  const num = (v: number | undefined) =>
    v === undefined ? <Skeleton className="h-7 w-12" /> : formatNumber(v);
  const money = (v: number | undefined) =>
    v === undefined ? <Skeleton className="h-7 w-24" /> : formatPKR(v);

  // Localized short month labels for the revenue bars (e.g. Jan, Feb…).
  const monthFmt = new Intl.DateTimeFormat(language === "ur" ? "ur-PK" : "en-PK", {
    month: "short",
  });
  const revenueData = (revenue.data ?? []).map((p) => ({
    label: monthFmt.format(new Date(`${p.key}-01`)),
    value: p.total,
    valueLabel: formatCompactPKR(p.total),
  }));

  const pb = payments.data ?? { cash: 0, partial: 0, credit: 0 };
  const paymentSegments: Segment[] = [
    { label: t("payment.cash"), value: pb.cash, valueLabel: formatPKR(pb.cash), tone: "success" },
    { label: t("payment.partial"), value: pb.partial, valueLabel: formatPKR(pb.partial), tone: "warning" },
    { label: t("payment.credit"), value: pb.credit, valueLabel: formatPKR(pb.credit), tone: "danger" },
  ];

  const cat = catalog.data;
  const inStock = cat ? Math.max(cat.products - cat.lowStock - cat.outOfStock, 0) : 0;
  const stockSegments: Segment[] = [
    { label: t("warehouse.inStock"), value: inStock, tone: "success" },
    { label: t("warehouse.lowStock"), value: cat?.lowStock ?? 0, tone: "warning" },
    { label: t("warehouse.outOfStock"), value: cat?.outOfStock ?? 0, tone: "danger" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} />

      {/* Financial + relationship widgets — super_admin only. */}
      {isSuperAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <WidgetCard
            label={t("dashboard.revenueThisMonth")}
            value={money(finance.data?.revenueThisMonth)}
            icon={Wallet}
            tone="success"
            href="/orders"
          />
          <WidgetCard
            label={t("dashboard.ordersThisMonth")}
            value={num(finance.data?.ordersThisMonth)}
            icon={ShoppingCart}
            tone="primary"
            href="/orders"
          />
          <WidgetCard
            label={t("dashboard.outstanding")}
            value={money(finance.data?.outstanding)}
            icon={BookUser}
            tone="warning"
            href="/khata"
          />
          <WidgetCard
            label={t("dashboard.customers")}
            value={num(finance.data?.customers)}
            icon={Users}
            tone="brand"
            href="/customers"
          />
          <WidgetCard
            label={t("dashboard.suppliers")}
            value={num(finance.data?.suppliers)}
            icon={Truck}
            tone="primary"
            href="/suppliers"
          />
          <WidgetCard
            label={t("dashboard.products")}
            value={num(catalog.data?.products)}
            icon={Tag}
            tone="brand"
            href="/warehouse"
          />
        </div>
      )}

      {/* Read-only admin: a compact stock-only set (no charts overload). */}
      {!isSuperAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <WidgetCard
            label={t("dashboard.products")}
            value={num(catalog.data?.products)}
            icon={Tag}
            tone="brand"
            href="/warehouse"
          />
          <WidgetCard
            label={t("dashboard.lowStock")}
            value={num(catalog.data?.lowStock)}
            icon={AlertTriangle}
            tone="warning"
            href="/warehouse"
          />
          <WidgetCard
            label={t("dashboard.outOfStock")}
            value={num(catalog.data?.outOfStock)}
            icon={PackageX}
            tone="danger"
            href="/warehouse"
          />
        </div>
      )}

      {/* Charts. Super_admin: revenue + payment mix + stock health (with totals);
          a read-only admin: the stock-health chart only. */}
      {isSuperAdmin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t("dashboard.revenueTrend")} className="lg:col-span-2">
            {revenue.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <BarChart data={revenueData} />
            )}
          </ChartCard>
          <ChartCard title={t("dashboard.paymentMix")}>
            {payments.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <SegmentBar segments={paymentSegments} />
            )}
          </ChartCard>
          <ChartCard title={t("dashboard.stockHealth")}>
            <SegmentBar segments={stockSegments} />
          </ChartCard>
        </div>
      ) : (
        <ChartCard title={t("dashboard.stockHealth")}>
          <SegmentBar segments={stockSegments} />
        </ChartCard>
      )}

      {/* Khata reminders panel — super_admin only. */}
      {isSuperAdmin && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t("khata.reminders")}</h2>
            <Button variant="outline" size="sm" onClick={() => openDialog(DialogKey.ReminderForm, null)}>
              <BellPlus className="me-1 h-4 w-4" />
              {t("khata.newReminder")}
            </Button>
          </div>
          <KhataTable
            rows={reminders.data ?? []}
            loading={reminders.isLoading}
            onMarkFulfilled={fulfill}
            markingId={pendingId}
            onViewReceipt={(orderId) => openDialog(DialogKey.Receipt, { orderId })}
            onRowClick={(khata) => openDialog(DialogKey.KhataDetail, { khata })}
            emptyText={t("common.noResults")}
          />
        </div>
      )}
    </div>
  );
}
