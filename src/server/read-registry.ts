import "server-only";

import * as attendance from "@/server/actions/attendance";
import * as customers from "@/server/actions/customers";
import * as dashboard from "@/server/actions/dashboard";
import * as items from "@/server/actions/items";
import * as khata from "@/server/actions/khata";
import * as orders from "@/server/actions/orders";
import * as salary from "@/server/actions/salary";
import * as search from "@/server/actions/search";
import * as settings from "@/server/actions/settings";
import * as staff from "@/server/actions/staff";
import * as supplierOrders from "@/server/actions/supplier-orders";
import * as suppliers from "@/server/actions/suppliers";
import * as users from "@/server/actions/users";
import * as warehouse from "@/server/actions/warehouse";

/**
 * Every read the client is allowed to invoke through /api/read.
 *
 * WHY THIS EXISTS. Reads used to be Server Actions called straight from React
 * Query. Next.js dispatches Server Functions from the client ONE AT A TIME (see
 * node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md), so
 * a screen firing several queries paid their latency end-to-end instead of
 * overlapping them — ~4x on a database ~250ms away. Route Handlers are plain
 * HTTP, which the browser happily runs in parallel, so reads go through here.
 *
 * Mutations deliberately stay as Server Actions: for writes, one-at-a-time
 * dispatch is a feature, not a cost.
 *
 * This is an explicit allow-list — the client sends an op NAME, never a module
 * path or function reference, so no arbitrary server function is reachable.
 * Every listed function takes the caller's access token as its first argument
 * and runs RLS-scoped as that user, exactly as before.
 */
export const READS = {
  "attendance.forDate": attendance.getAttendanceForDate,
  "attendance.staffAbsentDates": attendance.getStaffAbsentDates,

  "customers.list": customers.listCustomers,
  "customers.get": customers.getCustomer,
  "customers.orders": customers.getCustomerOrders,
  "customers.lastPurchase": customers.getLastPurchase,
  "customers.itemPricing": customers.getItemPricingForCustomer,
  "customers.usedIds": customers.listUsedCustomerIds,

  "dashboard.bundle": dashboard.getDashboardBundle,
  "dashboard.revenueTrend": dashboard.getRevenueTrend,

  "items.list": items.listItems,
  "items.usedIds": items.listUsedItemIds,

  "khata.list": khata.listKhatas,
  "khata.reminders": khata.getKhataReminders,

  "orders.list": orders.listOrders,
  "orders.forEdit": orders.getOrderForEdit,
  "orders.receipt": orders.getOrderReceipt,
  "orders.supplierBuyingPrice": orders.getSupplierBuyingPrice,
  "orders.khataInfo": orders.getOrderKhataInfo,

  "salary.overview": salary.listSalaryOverview,
  "salary.forStaff": salary.getStaffSalary,
  "salary.advances": salary.listAdvances,

  "search.global": search.globalSearch,

  "settings.lockedTabs": settings.getLockedTabs,
  "settings.navShortcuts": settings.getNavShortcuts,
  "settings.reminderLeadDays": settings.getReminderLeadDays,

  "staff.list": staff.listStaff,
  "staff.get": staff.getStaff,

  "supplierOrders.list": supplierOrders.listSupplierOrders,
  "supplierOrders.get": supplierOrders.getSupplierOrder,
  "supplierOrders.bySupplier": supplierOrders.listSupplierOrdersBySupplier,
  "supplierOrders.supplierItems": supplierOrders.getSupplierItems,
  "supplierOrders.frequentItems": supplierOrders.getFrequentItemsForSupplier,

  "suppliers.list": suppliers.listSuppliers,
  "suppliers.forItem": suppliers.listSuppliersForItem,

  "users.list": users.listUsers,

  "warehouse.itemsWithStock": warehouse.listItemsWithStock,
  "warehouse.itemStock": warehouse.getItemStock,
  "warehouse.stockEntries": warehouse.listStockEntries,
} as const;

export type Reads = typeof READS;
export type ReadOp = keyof Reads;

/** The arguments an op takes, minus the access token the route injects. */
export type ReadArgs<K extends ReadOp> = Reads[K] extends (
  token: string,
  ...rest: infer A
) => unknown
  ? A
  : never;

/** What an op resolves to. */
export type ReadResult<K extends ReadOp> = Awaited<ReturnType<Reads[K]>>;
