/**
 * Centralized React Query key factory — single source of truth for cache keys.
 * Use these everywhere so invalidation stays consistent across the app.
 */
export const queryKeys = {
  profile: () => ["profile"] as const,

  items: (search?: string) => ["items", { search: search ?? "" }] as const,
  item: (id: string) => ["items", id] as const,
  itemStock: (id: string) => ["items", id, "stock"] as const,
  usedItemIds: () => ["items", "used"] as const,

  suppliers: (search?: string) => ["suppliers", { search: search ?? "" }] as const,

  customers: (search?: string) => ["customers", { search: search ?? "" }] as const,
  customer: (id: string) => ["customers", id] as const,
  customerHistory: (id: string) => ["customers", id, "history"] as const,
  usedCustomerIds: () => ["customers", "used"] as const,

  stockEntries: (itemId?: string) => ["stock-entries", { itemId: itemId ?? "" }] as const,
  warehouseStock: () => ["warehouse-stock"] as const,

  orders: (search?: string) => ["orders", { search: search ?? "" }] as const,
  order: (id: string) => ["orders", id] as const,

  supplierOrders: (search?: string) => ["supplier-orders", { search: search ?? "" }] as const,
  supplierOrder: (id: string) => ["supplier-orders", id] as const,

  khatas: (status?: string) => ["khatas", { status: status ?? "" }] as const,
  khataReminders: () => ["khatas", "reminders"] as const,

  users: () => ["users"] as const,
  settings: () => ["settings"] as const,

  staff: (search?: string) => ["staff", { search: search ?? "" }] as const,
  staffMember: (id: string) => ["staff", id] as const,
  attendance: (date: string) => ["attendance", date] as const,
  staffAbsentDates: (staffId: string, month: string) =>
    ["attendance", "absent-dates", staffId, month] as const,
  salaryOverview: (month: string) => ["salary", "overview", month] as const,
  staffSalary: (staffId: string, month: string) => ["salary", staffId, month] as const,
  advances: (staffId: string, month?: string) =>
    ["advances", staffId, { month: month ?? "" }] as const,

  /** Pricing context (last sold price + cost then + current cost) for a customer + item. */
  itemPricing: (customerId: string, itemId: string) =>
    ["item-pricing", customerId, itemId] as const,
} as const;
