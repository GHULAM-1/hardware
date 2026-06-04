import type { Item } from "@/types/models";

/** Client-side editable shapes for the order form (strings while editing). */
export type LineSupplierDraft = {
  key: string;
  supplier_id: string | null;
  quantity: string;
  buying_price: string;
};

export type LineDraft = {
  key: string;
  item: Item | null;
  quantity: string;
  unit: string;
  selling_price: string;
  suppliers: LineSupplierDraft[];
};

let counter = 0;
const nextKey = () => `k${counter++}`;

export function newSupplier(): LineSupplierDraft {
  return { key: nextKey(), supplier_id: null, quantity: "", buying_price: "" };
}

export function newLine(): LineDraft {
  return { key: nextKey(), item: null, quantity: "1", unit: "pcs", selling_price: "", suppliers: [] };
}

export function lineTotal(line: LineDraft): number {
  return (Number(line.quantity) || 0) * (Number(line.selling_price) || 0);
}

export function orderTotal(lines: LineDraft[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}
