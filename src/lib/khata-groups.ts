import { KhataStatus } from "@/lib/enums";
import type { KhataListView } from "@/types/models";

/** One customer's whole udhaar picture, derived from their individual khata rows. */
export type CustomerKhataGroup = {
  customer: NonNullable<KhataListView["customer"]>;
  /** Every entry for this customer (pending + fulfilled), pending first then by due date. */
  entries: KhataListView[];
  /** Count of unsettled entries — the number shown on the row. */
  pendingCount: number;
  /** Sum of the unsettled amounts — what they still owe (the row total). */
  totalOutstanding: number;
  /** Earliest due date among pending entries (drives the row's due badge); null if none. */
  soonestDueDate: string | null;
};

function byDueAsc(a: KhataListView, b: KhataListView): number {
  return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0;
}

/**
 * Collapse flat khata rows into one group per customer. Only customers with at
 * least one PENDING entry are returned (the khata page is a "who owes us" list);
 * a customer who has cleared everything drops off. Customer-less rows (manual
 * reminders) are skipped — the caller handles those separately.
 */
export function groupCustomerKhatas(rows: KhataListView[]): CustomerKhataGroup[] {
  const map = new Map<string, CustomerKhataGroup>();

  for (const k of rows) {
    if (!k.customer) continue;
    const id = k.customer.id;
    let g = map.get(id);
    if (!g) {
      g = { customer: k.customer, entries: [], pendingCount: 0, totalOutstanding: 0, soonestDueDate: null };
      map.set(id, g);
    }
    g.entries.push(k);
    if (k.status === KhataStatus.Pending) {
      g.pendingCount += 1;
      g.totalOutstanding += k.amount;
      if (g.soonestDueDate === null || k.due_date < g.soonestDueDate) g.soonestDueDate = k.due_date;
    }
  }

  const groups = Array.from(map.values()).filter((g) => g.pendingCount > 0);

  // Pending entries first (then by due date), fulfilled history after.
  for (const g of groups) {
    g.entries.sort((a, b) => {
      if (a.status !== b.status) return a.status === KhataStatus.Pending ? -1 : 1;
      return byDueAsc(a, b);
    });
  }

  // Most urgent customer first (soonest/overdue due date at the top).
  groups.sort((a, b) => {
    if (a.soonestDueDate === b.soonestDueDate) return 0;
    if (a.soonestDueDate === null) return 1;
    if (b.soonestDueDate === null) return -1;
    return a.soonestDueDate < b.soonestDueDate ? -1 : 1;
  });

  return groups;
}
