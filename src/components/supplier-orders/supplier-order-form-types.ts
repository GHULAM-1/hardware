import type { Item, SupplierOrderDetailView } from "@/types/models";

/** Client-side editable shape for a supplier-order line (strings while editing). */
export type SupplierOrderLineDraft = {
  key: string;
  /** Existing supplier_order_items.id — present only when editing. */
  id?: string;
  itemId: string | null;
  /** Full item, when known — powers the compatible-unit dropdown. */
  item: Item | null;
  supplierId: string | null;
  quantity: string;
  unit: string;
  note: string;
};

let counter = 0;
const nextKey = () => `so${counter++}`;

export function newLine(): SupplierOrderLineDraft {
  return { key: nextKey(), itemId: null, item: null, supplierId: null, quantity: "1", unit: "", note: "" };
}

/** Build a line from an item (used by the "add low-stock items" seed). */
export function lineFromItem(item: Item): SupplierOrderLineDraft {
  return {
    key: nextKey(),
    itemId: item.id,
    item,
    supplierId: null,
    quantity: "1",
    unit: item.primary_unit,
    note: "",
  };
}

/** Rebuild editable drafts from a saved order (for the edit flow). */
export function linesFromOrder(order: SupplierOrderDetailView): SupplierOrderLineDraft[] {
  return order.lines.map((l) => ({
    key: nextKey(),
    id: l.id,
    itemId: l.item_id,
    item: null,
    supplierId: l.supplier?.id ?? null,
    quantity: String(l.quantity),
    unit: l.unit,
    note: l.note ?? "",
  }));
}
