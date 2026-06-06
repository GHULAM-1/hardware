import { z } from "zod";

import { PaymentType, StaffAttendanceStatus, StockEntryType, UserRole } from "@/lib/enums";

/** Single source of truth for form/payload validation schemas. */

// Friendly, translatable validation messages. The map returns i18n KEYS (e.g.
// "validation.required"); FormMessage runs them through t() so errors show in the
// user's language with plain wording instead of zod's raw "Too small: …" text.
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return "validation.required";
      case "too_small":
        return issue.origin === "string" ? "validation.required" : "validation.min";
      case "too_big":
        return "validation.tooLong";
      case "invalid_format":
        return "validation.invalid";
      default:
        return undefined;
    }
  },
});

// Accepts string | null | undefined (so the schema is idempotent: re-parsing its
// own output — which uses null for empties — succeeds on the server).
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

// Pakistani mobile number, local format only: 03 + 9 digits (e.g. 03001234567).
// Country-code / +92 forms are rejected on purpose — the shop enters local numbers.
export const PK_PHONE_RE = /^03\d{9}$/;
export const isPkPhone = (v: string) => PK_PHONE_RE.test(v.trim());
const pkPhoneRequired = z.string().trim().regex(PK_PHONE_RE, "validation.invalidPhone");

// Pakistani CNIC: exactly 13 digits, stored raw (no dashes); formatted for display.
export const PK_CNIC_RE = /^\d{13}$/;
export const isPkCnic = (v: string) => PK_CNIC_RE.test(v.trim());
// Optional CNIC: empty -> null; if present must be 13 digits.
const optionalCnic = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || PK_CNIC_RE.test(v), "validation.invalidCnic");

export const itemSchema = z.object({
  name_en: z.string().trim().min(1),
  name_ur: optionalText,
  unit: z.string().trim().min(1),
  selling_price: z.coerce.number().min(0),
  category_id: z.string().uuid().nullable().optional().default(null),
  // Gallery of product images; first is the primary thumbnail used in lists.
  image_urls: z.array(z.string().url()).default([]),
});
export type ItemInput = z.input<typeof itemSchema>;
export type ItemValues = z.output<typeof itemSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(1),
  // The supplier's business (shop) name.
  shop_name: optionalText,
  // Phone is the supplier's unique key, so it's required and must be a valid PK number.
  phone: pkPhoneRequired,
  address: optionalText,
});
export type SupplierValues = z.output<typeof supplierSchema>;

export const customerSchema = z.object({
  name_en: z.string().trim().min(1),
  name_ur: optionalText,
  phone: optionalText,
  address: optionalText,
});
export type CustomerValues = z.output<typeof customerSchema>;

export const stockEntrySchema = z.object({
  item_id: z.string().uuid(),
  type: z.enum([StockEntryType.In, StockEntryType.Out]),
  quantity: z.coerce.number().positive(),
  supplier_id: z.string().uuid().nullable().optional().default(null),
  buying_price: z.coerce.number().min(0).nullable().optional().default(null),
  // Reason/note is optional for both stock in and stock out.
  note: optionalText,
  entry_date: z.string().min(1),
});
export type StockEntryValues = z.output<typeof stockEntrySchema>;

export const userSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1),
  role: z.enum([UserRole.SuperAdmin, UserRole.Admin]).default(UserRole.Admin),
});
export type UserValues = z.output<typeof userSchema>;

// Editing an existing staff member: name + avatar, and an OPTIONAL new password
// (blank = keep the current one). Email/role are managed elsewhere.
export const userUpdateSchema = z.object({
  full_name: z.string().trim().min(1),
  image_url: z.string().url().nullable().optional().default(null),
  password: z.string().min(6).or(z.literal("")).optional(),
});
export type UserUpdateValues = z.output<typeof userUpdateSchema>;

// A user editing their OWN account: name + avatar (password handled separately
// via the browser auth session). Role/active are never self-editable.
export const ownProfileSchema = z.object({
  full_name: z.string().trim().min(1),
  image_url: z.string().url().nullable().optional().default(null),
});
export type OwnProfileValues = z.output<typeof ownProfileSchema>;

export const khataSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().min(0),
  due_date: z.string(),
  description: optionalText,
});
export type KhataValues = z.output<typeof khataSchema>;

// A manual reminder: a note + a due date. Stored as a customer-less khata.
export const reminderSchema = z.object({
  description: z.string().trim().min(1),
  due_date: z.string().min(1),
});
export type ReminderValues = z.output<typeof reminderSchema>;

const orderLineSupplierSchema = z.object({
  supplier_id: z.string().uuid().nullable(),
  quantity: z.coerce.number().positive(),
  buying_price: z.coerce.number().min(0).nullable().optional().default(null),
});

const orderLineSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1),
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

// Supplier order: a material REQUEST list (no prices). Supplier is optional.
const supplierOrderLineSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1),
  note: optionalText,
});

export const supplierOrderSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional().default(null),
  note: optionalText,
  lines: z.array(supplierOrderLineSchema).min(1),
});
export type SupplierOrderValues = z.output<typeof supplierOrderSchema>;

/** Marking a supplier order received, optionally attaching the supplier's bill. */
export const supplierOrderReceiveSchema = z.object({
  bill_url: z.string().url().nullable().optional().default(null),
});
export type SupplierOrderReceiveValues = z.output<typeof supplierOrderReceiveSchema>;

// ── Staff management ─────────────────────────────────────────────────────────

// A staff member (non-login employee). Phone is the unique key (PK format);
// CNIC is optional but unique when present. Salary is required.
export const staffSchema = z.object({
  name: z.string().trim().min(1),
  phone: pkPhoneRequired,
  cnic: optionalCnic,
  address: optionalText,
  image_url: z.string().url().nullable().optional().default(null),
  // Required: a real, positive WHOLE amount (0/blank/decimals rejected).
  monthly_salary: z.coerce.number().int("validation.noDecimals").positive("validation.required"),
  is_active: z.boolean().default(true),
});
export type StaffValues = z.output<typeof staffSchema>;

// One staff member's mark for one day.
export const attendanceEntrySchema = z.object({
  staff_id: z.string().uuid(),
  status: z.enum([StaffAttendanceStatus.Present, StaffAttendanceStatus.Absent]),
});

// A whole day's attendance, saved in one batch (the daily checklist).
export const attendanceBatchSchema = z.object({
  date: z.string().min(1),
  entries: z.array(attendanceEntrySchema).min(1),
});
export type AttendanceBatchValues = z.output<typeof attendanceBatchSchema>;

// A mid-month salary advance: money the employee took early.
export const salaryAdvanceSchema = z.object({
  staff_id: z.string().uuid(),
  amount: z.coerce.number().int("validation.noDecimals").positive(),
  advance_date: z.string().min(1),
  note: optionalText,
});
export type SalaryAdvanceValues = z.output<typeof salaryAdvanceSchema>;

// Recording the salary actually paid for a month. The admin types amount_paid
// (defaults to the computed net in the UI, but is the final word); the computed
// figures are snapshot server-side.
export const salaryPaymentSchema = z.object({
  staff_id: z.string().uuid(),
  period_month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  amount_paid: z.coerce.number().int("validation.noDecimals").min(0),
  paid_on: z.string().min(1),
  note: optionalText,
});
export type SalaryPaymentValues = z.output<typeof salaryPaymentSchema>;

