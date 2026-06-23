"use client";

import { BellRing, Phone, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { displayName } from "@/lib/display";
import { formatDate, todayISO } from "@/lib/format";
import { useLanguage } from "@/providers/i18n-provider";
import { useKhataReminders } from "@/hooks/use-khata";
import { Money } from "@/components/common/money";
import { cn } from "@/lib/utils";
import type { KhataListView } from "@/types/models";

/** Whole days from today until a due date (negative = overdue). Date-only ISO. */
function daysUntil(dueISO: string, today: string): number {
  return Math.round((Date.parse(dueISO) - Date.parse(today)) / 86_400_000);
}

/**
 * An at-a-glance banner of customers whose payment is due soon (or overdue),
 * with a highlighted "days remaining" badge so the shopkeeper instantly sees how
 * urgent each one is. Reuses the dashboard reminder query; hidden when empty.
 *
 * Two shapes share this card: a real customer khata (shows name, phone, amount,
 * and — if it came from a sale — a receipt button), and a manual reminder (no
 * customer / no money), which leads with its note instead.
 */
export function DueSoonStrip({
  onOpen,
  onViewReceipt,
  className,
  beacon = false,
}: {
  onOpen: (khata: KhataListView) => void;
  onViewReceipt?: (orderId: string) => void;
  className?: string;
  /** Show the flashing red police-style urgency beacon beside the title (dashboard). */
  beacon?: boolean;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: reminders = [] } = useKhataReminders();
  const today = todayISO();

  if (reminders.length === 0) return null;

  // Translate the day-gap into a label + urgency colour for the highlight chip.
  function daysBadge(dueISO: string) {
    const d = daysUntil(dueISO, today);
    let text: string;
    if (d === 0) text = t("khata.dueToday");
    else if (d === 1) text = t("khata.dayLeft");
    else if (d > 1) text = t("khata.daysLeft", { count: d });
    else if (d === -1) text = t("khata.dayOverdue");
    else text = t("khata.daysOverdue", { count: -d });

    const tone =
      d < 0
        ? "border-destructive/40 bg-destructive/15 text-destructive"
        : d <= 2
          ? "border-warning/50 bg-warning/15 text-warning"
          : "border-brand/40 bg-brand/15 text-brand";
    return { text, tone };
  }

  return (
    <div className={cn("rounded-2xl border-2 border-warning/50 bg-cream p-3 text-ink shadow-card sm:p-4", className)}>
      <div className="mb-3 flex items-center gap-2.5">
        {beacon ? (
          <span className="beacon shrink-0" aria-hidden="true" />
        ) : (
          <BellRing className="h-5 w-5 shrink-0 text-warning" />
        )}
        <h2 className="text-sm font-extrabold sm:text-base">
          {t("khata.dueSoonCount", { count: reminders.length })}
        </h2>
      </div>

      <ul className="space-y-2">
        {reminders.map((k) => {
          const badge = daysBadge(k.due_date);
          const hasCustomer = Boolean(k.customer);
          // Title = customer name, or (for a manual reminder) its note.
          const title = hasCustomer ? displayName(k.customer!, language) : k.description || "—";
          return (
            <li key={k.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(k)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(k)}
                className="flex min-w-0 cursor-pointer flex-col gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Highlighted days-remaining chip — the urgency at a glance. */}
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-sm font-bold",
                      badge.tone,
                    )}
                  >
                    {badge.text}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-[#e11d1d]">{title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("fields.dueDate")}: {formatDate(k.due_date)}
                    </span>
                    {/* Show the note for customer khatas too (reminders already use it as title). */}
                    {hasCustomer && k.description ? (
                      <span className="truncate text-xs text-muted-foreground">{k.description}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                  {k.order_id && onViewReceipt ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewReceipt(k.order_id!);
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <Receipt className="h-4 w-4 shrink-0" />
                      {t("khata.receipt")}
                    </button>
                  ) : null}
                  {k.customer?.phone && (
                    <a
                      href={`tel:${k.customer.phone}`}
                      dir="ltr"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {k.customer.phone}
                    </a>
                  )}
                  {/* Money only when there's actually an amount (reminders are Rs 0).
                      Pending dues are shown in red to flag them at a glance. */}
                  {k.amount > 0 && (
                    <Money
                      value={k.amount}
                      className="shrink-0 whitespace-nowrap text-base font-extrabold text-[#e11d1d]"
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
