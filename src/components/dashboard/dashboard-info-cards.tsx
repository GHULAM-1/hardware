"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MapPin, Rocket } from "lucide-react";

import { getAccessToken } from "@/lib/auth-token";
import { getFinancialSummary, getPaymentBreakdown } from "@/server/actions/dashboard";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { formatPKR } from "@/lib/format";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { cn } from "@/lib/utils";

/** Shared cream-panel shell. */
const CARD = "flex flex-col rounded-2xl border-2 bg-cream p-3 text-ink shadow-card";

/**
 * The game-style cards at the bottom of the dashboard: quick actions + key money
 * figures, side by side. Super-admin only — a read-only admin sees neither (no
 * financials, no create actions), so the whole row is hidden for them.
 */
export function DashboardInfoCards() {
  const isSuperAdmin = useIsSuperAdmin();
  if (!isSuperAdmin) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <QuickActionsCard />
      <ImportantInfoCard />
    </div>
  );
}

function QuickActionsCard() {
  const { t } = useTranslation();
  const { openDialog } = useDialogManager();

  const actions: { icon: Icon3DName; label: string; onClick: () => void }[] = [
    { icon: "users", label: t("dashboard.addCustomer"), onClick: () => openDialog(DialogKey.CustomerForm, null) },
    { icon: "box-plus", label: t("dashboard.addItem"), onClick: () => openDialog(DialogKey.ItemCreate, null) },
    { icon: "cart-plus", label: t("dashboard.quickSale"), onClick: () => openDialog(DialogKey.OrderForm, null) },
  ];

  return (
    <section className={cn(CARD, "border-game-blue/60")}>
      <header className="mb-2 flex items-center gap-2">
        <Rocket className="h-5 w-5 shrink-0 text-game-blue-d" />
        <h3 className="truncate text-sm font-extrabold text-game-blue-d">{t("dashboard.quickActions")}</h3>
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-start text-sm font-semibold transition-colors hover:bg-white active:scale-[0.98]"
          >
            <Icon3D name={a.icon} size={28} alt="" />
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ImportantInfoCard() {
  const { t } = useTranslation();

  const finance = useQuery({
    queryKey: ["dashboard", "finance"],
    queryFn: async () => getFinancialSummary(await getAccessToken()),
  });
  const payments = useQuery({
    queryKey: ["dashboard", "payments"],
    queryFn: async () => getPaymentBreakdown(await getAccessToken()),
  });

  const rows: { icon: Icon3DName; label: string; value: string }[] = [
    { icon: "receipt", label: t("dashboard.totalUdhaar"), value: formatPKR(finance.data?.outstanding ?? 0) },
    { icon: "banknote", label: t("dashboard.totalCash"), value: formatPKR(payments.data?.cash ?? 0) },
    { icon: "wallet", label: t("dashboard.revenueThisMonth"), value: formatPKR(finance.data?.revenueThisMonth ?? 0) },
  ];

  return (
    <section className={cn(CARD, "border-gold")}>
      <header className="mb-2 flex items-center gap-2">
        <Icon3D name="star" size={26} alt="" />
        <h3 className="truncate text-sm font-extrabold text-ink">{t("dashboard.importantInfo")}</h3>
      </header>
      <ul className="min-h-0 flex-1 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Icon3D name={r.icon} size={22} alt="" />
              <span className="truncate font-semibold">{r.label}</span>
            </span>
            <span dir="ltr" className="shrink-0 whitespace-nowrap font-extrabold tabular-nums">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-1.5 border-t border-black/5 pt-2 text-xs font-semibold text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {t("dashboard.shopLocation")}: {t("dashboard.cityCountry")}
        </span>
      </div>
    </section>
  );
}
