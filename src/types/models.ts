/**
 * Hand-written view models and convenient aliases over the generated DB types.
 * Keeps the rest of the app from importing the verbose generated shapes directly.
 */
import type { Database } from "@/types/database";
import type { StaffAttendanceStatus } from "@/lib/enums";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];

export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];

export type Profile = Row<"profiles">;
/** A profile with its auth email resolved (admin-only; emails live in auth.users). */
export type ProfileWithEmail = Profile & { email: string | null };
export type Supplier = Row<"suppliers">;
export type Category = Row<"categories">;
export type Item = Row<"items">;
export type StockEntry = Row<"stock_entries">;
export type Customer = Row<"customers">;
export type Order = Row<"orders">;
export type OrderItem = Row<"order_items">;
export type OrderItemSupplier = Row<"order_item_suppliers">;
export type Khata = Row<"khatas">;
export type AppSetting = Row<"app_settings">;
export type SupplierOrder = Row<"supplier_orders">;
export type SupplierOrderItem = Row<"supplier_order_items">;
export type Staff = Row<"staff">;
export type StaffAttendance = Row<"staff_attendance">;
export type SalaryAdvance = Row<"salary_advances">;
export type SalaryPayment = Row<"salary_payments">;

/** One staff member's mark for a given day (null = not yet marked → treated present). */
export type AttendanceRow = {
  staff: Staff;
  status: StaffAttendanceStatus | null;
  /** Check-in / check-out time ("HH:MM:SS"), only set for present days. */
  entry_time: string | null;
  exit_time: string | null;
};

/** A staff member's salary picture for one month — the breakdown + paid status. */
export type StaffSalaryRow = {
  staff: Staff;
  daysInMonth: number;
  /** Days owed this month after the join date (full month for existing staff). */
  payableDays: number;
  absentDays: number;
  perDay: number;
  /** Prorated salary base = perDay × payableDays (equals monthly salary when full). */
  earnedSalary: number;
  absenceDeduction: number;
  advancesTotal: number;
  /** Suggested net to pay (salary − absence deduction − advances); may be negative. */
  netPayable: number;
  paid: boolean;
  /** What the admin actually recorded as paid (null until paid). */
  amountPaid: number | null;
  paidOn: string | null;
  /** The note saved with the payment (null until paid / no note) — for prefilling edits. */
  paymentNote: string | null;
};

/** One marked attendance day in a month, with optional in/out times. */
export type AttendanceLogRow = {
  date: string;
  status: StaffAttendanceStatus;
  entry_time: string | null;
  exit_time: string | null;
};

/** A staff member's salary for one month, with that month's advances + attendance. */
export type StaffSalaryDetail = StaffSalaryRow & {
  advances: SalaryAdvance[];
  attendance: AttendanceLogRow[];
};

export type WarehouseStock = Views["warehouse_stock"]["Row"];

/** Item joined with its derived warehouse quantity (pricing + warehouse share one item). */
export type ItemWithStock = Item & { quantity: number };

/** A stock entry with its (optional) supplier name resolved for display. */
export type StockEntryWithSupplier = StockEntry & {
  suppliers: Pick<Supplier, "id" | "name"> | null;
};

/** A bilingual item name pair (used by nested order line views). */
export type ItemNamePair = Pick<Item, "name_en" | "name_ur">;

/** One line of a customer's past order, flattened for display. */
export type OrderLineView = {
  quantity: number;
  unit: string;
  selling_price: number;
  item: ItemNamePair | null;
};

/** A customer's past order with its lines. */
export type CustomerOrderView = Pick<
  Order,
  "id" | "order_no" | "created_at" | "total" | "payment_type" | "status"
> & { lines: OrderLineView[] };

/** "Most recent purchase of this customer was X at price Y". */
export type LastPurchaseView = { item: ItemNamePair; price: number } | null;

/** A khata row with its customer's name resolved, for the khata list & reminders. */
export type KhataListView = Pick<
  Khata,
  "id" | "amount" | "due_date" | "status" | "description" | "created_at" | "order_id" | "proof_url"
> & {
  customer: { id: string; name_en: string; name_ur: string | null; phone: string | null } | null;
};

/** An order row with its customer's name resolved, for the orders list. */
export type OrderListView = Pick<
  Order,
  "id" | "order_no" | "created_at" | "total" | "amount_paid" | "balance_due" | "payment_type" | "status" | "due_date"
> & { customer: { name_en: string; name_ur: string | null } | null };

/** A supplier order row for the list, with the distinct supplier names + item names. */
export type SupplierOrderListView = Pick<
  SupplierOrder,
  "id" | "order_no" | "created_at" | "status" | "received_at"
> & { suppliers: string[]; item_count: number; items: ItemNamePair[] };

/** An item aggregated across a supplier's orders — "what we usually buy here". */
export type SupplierFrequentItem = { item: ItemNamePair; total: number };

/**
 * One line of a supplier order, flattened for display. Carries its own supplier
 * and how much was received (null = not tallied yet) plus the item's cover image.
 */
export type SupplierOrderLineView = {
  id: string;
  item_id: string | null;
  quantity: number;
  received_quantity: number | null;
  unit: string;
  note: string | null;
  supplier: { id: string; name: string } | null;
  item: (ItemNamePair & { image_url: string | null }) | null;
};

/** A full supplier order rendered for the detail dialog + print/PDF. */
export type SupplierOrderDetailView = Pick<
  SupplierOrder,
  "id" | "order_no" | "created_at" | "status" | "received_at" | "note" | "bill_url"
> & {
  lines: SupplierOrderLineView[];
};

/** A full order loaded for editing — line items carry the FULL item (for unit/price options). */
export type OrderEditView = Pick<
  Order,
  "id" | "customer_id" | "payment_type" | "amount_paid" | "due_date" | "internal_note" | "total"
> & {
  lines: { item: Item | null; quantity: number; unit: string; selling_price: number }[];
};

/** A full order rendered as a printable receipt. */
export type OrderReceiptView = Pick<
  Order,
  | "id"
  | "order_no"
  | "created_at"
  | "total"
  | "amount_paid"
  | "balance_due"
  | "payment_type"
  | "due_date"
  | "internal_note"
> & {
  customer: { name_en: string; name_ur: string | null; phone: string | null } | null;
  lines: OrderLineView[];
};
