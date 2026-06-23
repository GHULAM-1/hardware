import { KhataStatus, PaymentType } from "@/lib/enums";
import type { StatusTone } from "@/components/common/status-badge";

/** Domain status → badge tone + i18n label key. Single source for badges across modules. */

export function paymentMeta(type: PaymentType): { tone: StatusTone; labelKey: string } {
  switch (type) {
    case PaymentType.Cash:
      return { tone: "success", labelKey: "payment.cash" };
    case PaymentType.Partial:
      return { tone: "warning", labelKey: "payment.partial" };
    case PaymentType.Credit:
      return { tone: "danger", labelKey: "payment.credit" };
  }
}

/**
 * Warehouse stock badge: out (danger) → low (warning) → in stock (success).
 * `thresholdBase` is the item's low-stock level in BASE units (see units.thresholdBase);
 * null means the item has no low-stock alert configured.
 */
export function stockMeta(
  quantity: number,
  thresholdBase: number | null,
): { tone: StatusTone; labelKey: string } {
  if (quantity <= 0) return { tone: "danger", labelKey: "warehouse.outOfStock" };
  if (thresholdBase != null && quantity <= thresholdBase)
    return { tone: "warning", labelKey: "warehouse.lowStock" };
  return { tone: "success", labelKey: "warehouse.inStock" };
}

/**
 * Khata badge. `pending` becomes `overdue` (danger) once the due date has passed.
 */
export function khataMeta(
  status: KhataStatus,
  dueDate: string,
  today: string,
): { tone: StatusTone; labelKey: string } {
  if (status === KhataStatus.Fulfilled) return { tone: "success", labelKey: "khata.fulfilled" };
  if (dueDate < today) return { tone: "danger", labelKey: "khata.overdue" };
  return { tone: "warning", labelKey: "khata.pending" };
}
