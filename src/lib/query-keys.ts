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

  khatas: (status?: string) => ["khatas", { status: status ?? "" }] as const,
  khataReminders: () => ["khatas", "reminders"] as const,

  users: () => ["users"] as const,
  settings: () => ["settings"] as const,

  /** Most recent selling price charged to a customer for a specific item. */
  lastSellingPrice: (customerId: string, itemId: string) =>
    ["last-selling-price", customerId, itemId] as const,
} as const;
