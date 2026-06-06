/**
 * Single source of truth for the app's enums. These mirror the Postgres enums
 * defined in supabase/migrations. Import from here everywhere — never re-declare.
 */

export const UserRole = {
  SuperAdmin: "super_admin",
  Admin: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StockEntryType = {
  In: "in",
  Out: "out",
} as const;
export type StockEntryType = (typeof StockEntryType)[keyof typeof StockEntryType];

export const PaymentType = {
  Cash: "cash",
  Partial: "partial",
  Credit: "credit",
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const OrderStatus = {
  Draft: "draft",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const KhataStatus = {
  Pending: "pending",
  Fulfilled: "fulfilled",
} as const;
export type KhataStatus = (typeof KhataStatus)[keyof typeof KhataStatus];

export const SupplierOrderStatus = {
  Pending: "pending",
  Received: "received",
} as const;
export type SupplierOrderStatus = (typeof SupplierOrderStatus)[keyof typeof SupplierOrderStatus];

export const StaffAttendanceStatus = {
  Present: "present",
  Absent: "absent",
} as const;
export type StaffAttendanceStatus = (typeof StaffAttendanceStatus)[keyof typeof StaffAttendanceStatus];

/** Supported UI languages (Module 7). */
export const Language = {
  English: "en",
  Urdu: "ur",
} as const;
export type Language = (typeof Language)[keyof typeof Language];
