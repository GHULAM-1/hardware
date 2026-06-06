import type { Item } from "@/types/models";

/** Client-side editable shapes for the order form (strings while editing). */
export type LineDraft = {
  key: string;
  item: Item | null;
  quantity: string;
  unit: string;
  selling_price: string;
};

let counter = 0;
const nextKey = () => `k${counter++}`;

export function newLine(): LineDraft {
  return { key: nextKey(), item: null, quantity: "1", unit: "", selling_price: "" };
}

export function lineTotal(line: LineDraft): number {
  return (Number(line.quantity) || 0) * (Number(line.selling_price) || 0);
}

export function orderTotal(lines: LineDraft[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}
