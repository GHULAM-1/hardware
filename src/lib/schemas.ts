import { z } from "zod";

import { PaymentType, StockEntryType, UserRole } from "@/lib/enums";

/** Single source of truth for form/payload validation schemas. */

// Accepts string | null | undefined (so the schema is idempotent: re-parsing its
// own output — which uses null for empties — succeeds on the server).
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

export const itemSchema = z.object({
  name_en: z.string().trim().min(1),
  name_ur: optionalText,
  unit: z.string().trim().min(1).default("pcs"),
  selling_price: z.coerce.number().min(0),
  category_id: z.string().uuid().nullable().optional().default(null),
  image_url: z.string().url().nullable().optional().default(null),
});
export type ItemInput = z.input<typeof itemSchema>;
export type ItemValues = z.output<typeof itemSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(1),
  phone: optionalText,
  note: optionalText,
});
export type SupplierValues = z.output<typeof supplierSchema>;

export const customerSchema = z.object({
  name_en: z.string().trim().min(1),
  name_ur: optionalText,
  phone: optionalText,
  email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
  address: optionalText,
});
export type CustomerValues = z.output<typeof customerSchema>;

export const stockEntrySchema = z
  .object({
    item_id: z.string().uuid(),
    type: z.enum([StockEntryType.In, StockEntryType.Out]),
    quantity: z.coerce.number().positive(),
    supplier_id: z.string().uuid().nullable().optional().default(null),
    buying_price: z.coerce.number().min(0).nullable().optional().default(null),
    note: optionalText,
    entry_date: z.string().min(1),
  })
  // A manual deduction (stock out) must state a reason.
  .refine((v) => v.type !== StockEntryType.Out || Boolean(v.note), {
    message: "Reason is required for stock out",
    path: ["note"],
  });
export type StockEntryValues = z.output<typeof stockEntrySchema>;

export const userSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1),
  role: z.enum([UserRole.SuperAdmin, UserRole.Admin]).default(UserRole.Admin),
});
export type UserValues = z.output<typeof userSchema>;

export const khataSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().min(0),
  due_date: z.string(),
  description: optionalText,
});
export type KhataValues = z.output<typeof khataSchema>;

const orderLineSupplierSchema = z.object({
  supplier_id: z.string().uuid().nullable(),
  quantity: z.coerce.number().positive(),
  buying_price: z.coerce.number().min(0).nullable().optional().default(null),
});

const orderLineSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).default("pcs"),
  selling_price: z.coerce.number().min(0),
  suppliers: z.array(orderLineSupplierSchema).default([]),
});

/** Edit an existing partial/credit order's payment (due date, amount paid). */
export const orderPaymentSchema = z.object({
  amount_paid: z.coerce.number().min(0),
  due_date: z.string().min(1),
});
export type OrderPaymentValues = z.output<typeof orderPaymentSchema>;

export const orderSchema = z
  .object({
    customer_id: z.string().uuid(),
    payment_type: z.enum([PaymentType.Cash, PaymentType.Partial, PaymentType.Credit]),
    amount_paid: z.coerce.number().min(0).default(0),
    due_date: z.string().nullable().optional().default(null),
    lines: z.array(orderLineSchema).min(1),
  })
  .refine(
    (o) => o.payment_type === PaymentType.Cash || Boolean(o.due_date),
    { message: "due_date required for partial/credit", path: ["due_date"] },
  );
export type OrderValues = z.output<typeof orderSchema>;
