"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getAccessToken } from "@/lib/auth-token";
import { getCatalogSummary, getFinancialSummary, getTodayStats } from "@/server/actions/dashboard";
import { useKhataReminders } from "@/hooks/use-khata";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { formatNumber, formatPKR } from "@/lib/format";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { cn } from "@/lib/utils";

type CardColor = "green" | "blue" | "purple" | "orange" | "red";
const CANDY: Record<CardColor, string> = {
  green: "candy-green",
  blue: "candy-blue",
  purple: "candy-purple",
  orange: "candy-orange",
  red: "candy-red",
};

function StatCard({
  href,
  color,
  icon,
  label,
  value,
  loading,
}: {
  href: string;
  color: CardColor;
  icon: Icon3DName;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "candy candy-lg flex h-[80px] min-w-[164px] shrink-0 items-center gap-3 rounded-2xl px-3.5 text-white",
        CANDY[color],
      )}
    >
      <Icon3D name={icon} size={54} className="shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" />
      <div className="min-w-0 flex-1 text-start">
        <div className="truncate text-[13px] font-bold text-white/90">{label}</div>
        <div
          dir="ltr"
          className="truncate text-start text-[22px] font-extrabold tabular-nums [text-shadow:0_2px_0_rgba(0,0,0,0.25)]"
        >
          {loading ? "…" : value}
        </div>
      </div>
    </Link>
  );
}

/**
 * Global KPI stat strip under the topbar. Card color matches each 3D icon's own
 * tile so they read clean (no tile-on-tile clash). Financial cards are
 * super-admin only; a read-only admin sees the stock cards.
 */
export function StatBar() {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();

  const catalog = useQuery({
    queryKey: ["dashboard", "catalog"],
    queryFn: async () => getCatalogSummary(await getAccessToken()),
  });
  const finance = useQuery({
    queryKey: ["dashboard", "finance"],
    queryFn: async () => getFinancialSummary(await getAccessToken()),
    enabled: isSuperAdmin,
  });
  const today = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: async () => getTodayStats(await getAccessToken()),
    enabled: isSuperAdmin,
  });
  // Same payments-due-soon signal as the dashboard strip — drives the urgency
  // beacon ahead of the first KPI card (super-admin only; gone when nothing's due).
  const { data: reminders = [] } = useKhataReminders();

  return (
    <div className="shrink-0 overflow-x-auto px-4 pt-3 pb-1 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* w-max + mx-auto centres the cards when they fit but still lets them scroll
          from the start on narrow screens (plain justify-center clips the first). */}
      <div className="mx-auto flex w-max items-center gap-3">
        {isSuperAdmin ? (
          <>
            {reminders.length > 0 && (
              <Link
                href="/khata"
                aria-label={t("khata.dueSoonCount", { count: reminders.length })}
                className={cn(
                  "candy candy-lg flex h-[80px] min-w-[164px] shrink-0 items-center gap-3 rounded-2xl px-3.5 text-white",
                  CANDY.red,
                )}
              >
                <span className="beacon ms-1 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-start">
                  <div className="truncate text-[13px] font-bold text-white/90">
                    {t("dashboard.paymentsDue")}
                  </div>
                  <div className="truncate text-start text-[22px] font-extrabold tabular-nums [text-shadow:0_2px_0_rgba(0,0,0,0.25)]">
                    {reminders.length}
                  </div>
                </div>
              </Link>
            )}
            <StatCard
              href="/orders"
              color="green"
              icon="cart-plus"
              label={t("dashboard.salesToday")}
              value={formatPKR(today.data?.salesToday ?? 0)}
              loading={today.isLoading}
            />
            <StatCard
              href="/khata"
              color="orange"
              icon="receipt"
              label={t("dashboard.outstanding")}
              value={formatPKR(finance.data?.outstanding ?? 0)}
              loading={finance.isLoading}
            />
            <StatCard
              href="/customers"
              color="purple"
              icon="users"
              label={t("dashboard.customers")}
              value={formatNumber(finance.data?.customers ?? 0)}
              loading={finance.isLoading}
            />
            <StatCard
              href="/warehouse"
              color="blue"
              icon="boxes"
              label={t("dashboard.products")}
              value={formatNumber(catalog.data?.products ?? 0)}
              loading={catalog.isLoading}
            />
          </>
        ) : (
          <>
            <StatCard
              href="/warehouse"
              color="blue"
              icon="boxes"
              label={t("dashboard.products")}
              value={formatNumber(catalog.data?.products ?? 0)}
              loading={catalog.isLoading}
            />
            <StatCard
              href="/warehouse"
              color="red"
              icon="alert-triangle"
              label={t("dashboard.lowStock")}
              value={formatNumber(catalog.data?.lowStock ?? 0)}
              loading={catalog.isLoading}
            />
            <StatCard
              href="/warehouse"
              color="purple"
              icon="box"
              label={t("dashboard.outOfStock")}
              value={formatNumber(catalog.data?.outOfStock ?? 0)}
              loading={catalog.isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
