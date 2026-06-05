/**
 * Hand-written view models and convenient aliases over the generated DB types.
 * Keeps the rest of the app from importing the verbose generated shapes directly.
 */
import type { Database } from "@/types/database";

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
  "id" | "amount" | "due_date" | "status" | "description" | "created_at" | "order_id"
> & {
  customer: { id: string; name_en: string; name_ur: string | null; phone: string | null } | null;
};

/** An order row with its customer's name resolved, for the orders list. */
export type OrderListView = Pick<
  Order,
  "id" | "order_no" | "created_at" | "total" | "amount_paid" | "balance_due" | "payment_type" | "status" | "due_date"
> & { customer: { name_en: string; name_ur: string | null } | null };

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
> & {
  customer: { name_en: string; name_ur: string | null; phone: string | null } | null;
  lines: OrderLineView[];
};
