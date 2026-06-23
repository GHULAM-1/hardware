import type { Item } from "@/types/models";

/** Client-side editable shape for a supplier-order line (strings while editing). */
export type SupplierOrderLineDraft = {
  key: string;
  item: Item | null;
  quantity: string;
  unit: string;
  note: string;
};

let counter = 0;
const nextKey = () => `so${counter++}`;

export function newLine(): SupplierOrderLineDraft {
  return { key: nextKey(), item: null, quantity: "1", unit: "", note: "" };
}

/** Build a line from an item (used by the "add low-stock items" seed). */
export function lineFromItem(item: Item): SupplierOrderLineDraft {
  return { key: nextKey(), item, quantity: "1", unit: item.primary_unit, note: "" };
}
