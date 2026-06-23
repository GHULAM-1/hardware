import "server-only";
import { tool } from "ai";
import { z } from "zod";

import { createActionClient } from "@/lib/supabase/server";
import { embedText, toVectorLiteral } from "@/server/ai/embed";
import { listCustomers, getCustomerOrders, getLastPurchase } from "@/server/actions/customers";
import { listItems } from "@/server/actions/items";
import { listItemsWithStock, listStockEntries } from "@/server/actions/warehouse";
import { listOrders, getOrderReceipt } from "@/server/actions/orders";
import { listKhatas, getKhataReminders } from "@/server/actions/khata";
import { listSuppliers } from "@/server/actions/suppliers";
import { listSupplierOrders, getSupplierOrder } from "@/server/actions/supplier-orders";
import { listUsers } from "@/server/actions/users";
import { listStaff } from "@/server/actions/staff";
import { getAttendanceForDate } from "@/server/actions/attendance";
import { getStaffSalary, listSalaryOverview } from "@/server/actions/salary";
import { getReminderLeadDays } from "@/server/actions/settings";
import {
  getDashboardStats,
  getCatalogSummary,
  getFinancialSummary,
  getRevenueTrend,
  getPaymentBreakdown,
} from "@/server/actions/dashboard";
import { KhataStatus } from "@/lib/enums";
import { fromBase, thresholdBase } from "@/lib/units";
import { ASSISTANT_ROUTES } from "@/types/assistant";

/**
 * Build the assistant's read-only toolset, bound to the caller's access token so
 * every query runs RLS-scoped (the assistant only sees what the user may see).
 * Each structured tool reuses an existing server action — no duplicated queries.
 * pgvector (semanticSearch) resolves fuzzy/bilingual references; the rest fetch
 * authoritative relational facts.
 *
 * Role-aware: a non-super-admin "admin" gets ONLY catalog + stock tools (what
 * their dashboard/warehouse already show). The financial/relational tools are
 * withheld entirely so the assistant can't surface data the UI hides from them —
 * RLS alone isn't enough because aggregates are derived from readable tables.
 */
export function buildTools(accessToken: string, isSuperAdmin: boolean) {
  const all = {
    semanticSearch: tool({
      description:
        "Find catalog items by meaning, spelling variants, or Urdu names when an exact name is unknown. Use this first to resolve a fuzzy item reference, then read precise data with other tools.",
      inputSchema: z.object({
        query: z.string().describe("What the user is looking for, e.g. 'plumbing pipe' or an Urdu item name"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ query, limit }) => {
        const embedding = await embedText(query);
        const client = createActionClient(accessToken);
        const { data, error } = await client.rpc("match_items", {
          query_embedding: toVectorLiteral(embedding),
          match_count: limit,
        });
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }),

    searchCustomers: tool({
      description:
        "Search customers by English name, Urdu name, or phone. Returns matching customers with their ids.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const rows = await listCustomers(accessToken, query);
        return rows.map((c) => ({
          id: c.id,
          name_en: c.name_en,
          name_ur: c.name_ur,
          phone: c.phone,
        }));
      },
    }),

    getCustomerOverview: tool({
      description:
        "Get a customer's order history and most recent purchase by customer id. Use after searchCustomers to answer questions about what a customer bought, owes, or spent.",
      inputSchema: z.object({ customerId: z.string().uuid() }),
      execute: async ({ customerId }) => {
        const [orders, lastPurchase] = await Promise.all([
          getCustomerOrders(accessToken, customerId),
          getLastPurchase(accessToken, customerId),
        ]);
        return { orders, lastPurchase };
      },
    }),

    searchItems: tool({
      description:
        "Exact/keyword search of catalog items by name or SKU. Returns items with their selling price (PKR).",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const rows = await listItems(accessToken, query);
        return rows.map((i) => ({
          id: i.id,
          sku: i.sku,
          name_en: i.name_en,
          name_ur: i.name_ur,
          unit: i.primary_unit,
          selling_price: i.selling_price,
        }));
      },
    }),

    getItemStock: tool({
      description: "Get the current warehouse stock quantity for a specific item id.",
      inputSchema: z.object({ itemId: z.string().uuid() }),
      execute: async ({ itemId }) => {
        const items = await listItemsWithStock(accessToken);
        const found = items.find((i) => i.id === itemId);
        if (!found) return { found: false };
        return {
          found: true,
          name_en: found.name_en,
          name_ur: found.name_ur,
          // Report in the item's primary unit (quantity is stored in base units).
          primary_unit: found.primary_unit,
          quantity_primary: fromBase(found.quantity, found.base_per_primary),
          base_unit: found.base_unit,
          quantity_base: found.quantity,
        };
      },
    }),

    listOrders: tool({
      description: "List recent orders (most recent first), optionally filtered by order number.",
      inputSchema: z.object({ search: z.string().default("") }),
      execute: async ({ search }) => listOrders(accessToken, search),
    }),

    getOrderReceipt: tool({
      description: "Get the full receipt of one order (lines, totals, payment, balance) by order id.",
      inputSchema: z.object({ orderId: z.string().uuid() }),
      execute: async ({ orderId }) => getOrderReceipt(accessToken, orderId),
    }),

    listKhata: tool({
      description:
        "List khata (credit/debt) entries — who owes money and when it's due. Filter by status to find pending dues.",
      inputSchema: z.object({
        status: z.enum([KhataStatus.Pending, KhataStatus.Fulfilled]).optional(),
      }),
      execute: async ({ status }) => listKhatas(accessToken, status ?? ""),
    }),

    getDashboardStats: tool({
      description: "Get shop-wide counts: total items, total customers, pending khata count.",
      inputSchema: z.object({}),
      execute: async () => getDashboardStats(accessToken),
    }),

    // ── Suppliers ────────────────────────────────────────────────────────────
    searchSuppliers: tool({
      description:
        "Search suppliers by name. Returns each supplier with shop name, phone and address. Use for questions like 'what's Hamza Traders' phone' or 'list my suppliers'.",
      inputSchema: z.object({ query: z.string().default("") }),
      execute: async ({ query }) => {
        const rows = await listSuppliers(accessToken, query);
        return rows.map((s) => ({
          id: s.id,
          name: s.name,
          shop_name: s.shop_name,
          phone: s.phone,
          address: s.address,
        }));
      },
    }),

    // ── Supplier orders (material request lists) ──────────────────────────────
    listSupplierOrders: tool({
      description:
        "List supplier orders (material request lists sent to suppliers), most recent first. Each shows its number, date, supplier, status (pending or received) and the items requested. Use for 'what did I order from suppliers' or 'which supplier orders are pending'.",
      inputSchema: z.object({ search: z.string().default("") }),
      execute: async ({ search }) => listSupplierOrders(accessToken, search),
    }),

    getSupplierOrder: tool({
      description:
        "Get one supplier order in full by its id: supplier details, every line item with quantity and note, status, and whether a bill is attached.",
      inputSchema: z.object({ supplierOrderId: z.string().uuid() }),
      execute: async ({ supplierOrderId }) => getSupplierOrder(accessToken, supplierOrderId),
    }),

    // ── Stock movement history ────────────────────────────────────────────────
    getStockHistory: tool({
      description:
        "Get the stock in/out movement history for one item id: each entry's type (in or out), quantity, date, buying price, and the supplier it came from. Use getItemStock for the current total; use this for the movement log behind it.",
      inputSchema: z.object({ itemId: z.string().uuid() }),
      execute: async ({ itemId }) => {
        const rows = await listStockEntries(accessToken, itemId);
        return rows.map((e) => ({
          type: e.type,
          quantity: e.quantity,
          entry_date: e.entry_date,
          buying_price: e.buying_price,
          supplier: e.suppliers?.name ?? null,
          note: e.note,
        }));
      },
    }),

    // ── Low / out-of-stock listing ────────────────────────────────────────────
    listLowStock: tool({
      description:
        "List items that are low or out of stock right now (quantity at or below the low-stock threshold). Use for 'what's running low' or 'what do I need to reorder'.",
      inputSchema: z.object({}),
      execute: async () => {
        const items = await listItemsWithStock(accessToken);
        return items
          .filter((i) => {
            if (!i.track_in_warehouse) return false;
            const tBase = thresholdBase(i);
            return i.quantity <= 0 || (tBase != null && i.quantity <= tBase);
          })
          .map((i) => ({
            id: i.id,
            name_en: i.name_en,
            name_ur: i.name_ur,
            primary_unit: i.primary_unit,
            quantity_primary: fromBase(i.quantity, i.base_per_primary),
            state: i.quantity <= 0 ? "out_of_stock" : "low_stock",
          }));
      },
    }),

    // ── Categories ────────────────────────────────────────────────────────────
    listCategories: tool({
      description: "List the catalog categories (id, name) used to group items.",
      inputSchema: z.object({}),
      execute: async () => {
        const client = createActionClient(accessToken);
        const { data, error } = await client
          .from("categories")
          .select("id, name")
          .order("name");
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }),

    // ── Team / login accounts (owner-only) ──────────────────────────────────────
    listTeamAccounts: tool({
      description:
        "List the app's LOGIN accounts (the team who can sign in) with their role (owner/super_admin or admin) and active status. These are NOT shop employees — use the staff tools for employees. Only the owner can read this.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const rows = await listUsers(accessToken);
          return rows.map((u) => ({
            full_name: u.full_name,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
          }));
        } catch {
          return { error: "not_permitted" };
        }
      },
    }),

    // ── Staff (employees: salary, attendance, advances — owner-only via RLS) ─────
    listStaff: tool({
      description:
        "List shop employees (non-login staff) with their phone, monthly salary (PKR) and whether they're active. Use for 'who works here', 'X's salary', 'staff list'.",
      inputSchema: z.object({ search: z.string().default("") }),
      execute: async () => {
        try {
          const rows = await listStaff(accessToken);
          return rows.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            monthly_salary: s.monthly_salary,
            is_active: s.is_active,
          }));
        } catch {
          return { error: "not_permitted" };
        }
      },
    }),

    getStaffSalary: tool({
      description:
        "Get one employee's salary for a month: monthly salary, absent days, absence deduction, advances taken, the suggested net to pay, and whether it's been paid (and how much). Use after listStaff. month is 'YYYY-MM'; omit for the current month.",
      inputSchema: z.object({
        staffId: z.string().uuid(),
        month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      }),
      execute: async ({ staffId, month }) => {
        try {
          const m = month ?? new Date().toLocaleDateString("en-CA").slice(0, 7);
          const d = await getStaffSalary(accessToken, staffId, m);
          return {
            name: d.staff.name,
            month: m,
            monthly_salary: d.staff.monthly_salary,
            absent_days: d.absentDays,
            absence_deduction: d.absenceDeduction,
            advances_total: d.advancesTotal,
            suggested_net: d.netPayable,
            paid: d.paid,
            amount_paid: d.amountPaid,
            paid_on: d.paidOn,
          };
        } catch {
          return { error: "not_permitted" };
        }
      },
    }),

    listSalaryOverview: tool({
      description:
        "List every employee's salary picture for a month: absent days, advances, suggested net, and paid/unpaid status. Use for 'who hasn't been paid', 'salaries this month'. month is 'YYYY-MM'; omit for the current month.",
      inputSchema: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }),
      execute: async ({ month }) => {
        try {
          const m = month ?? new Date().toLocaleDateString("en-CA").slice(0, 7);
          const rows = await listSalaryOverview(accessToken, m);
          return rows.map((r) => ({
            name: r.staff.name,
            absent_days: r.absentDays,
            advances_total: r.advancesTotal,
            suggested_net: r.netPayable,
            paid: r.paid,
            amount_paid: r.amountPaid,
          }));
        } catch {
          return { error: "not_permitted" };
        }
      },
    }),

    getStaffAttendance: tool({
      description:
        "Get who was present or absent on a specific day. date is 'YYYY-MM-DD'; omit for today. Use for 'who was absent today', 'attendance on <date>'.",
      inputSchema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
      execute: async ({ date }) => {
        try {
          const d = date ?? new Date().toLocaleDateString("en-CA");
          const rows = await getAttendanceForDate(accessToken, d);
          return rows.map((r) => ({
            name: r.staff.name,
            // Unmarked staff are treated as present (the default).
            status: r.status ?? "present",
          }));
        } catch {
          return { error: "not_permitted" };
        }
      },
    }),

    // ── Dues coming due ──────────────────────────────────────────────────────
    getDuesReminders: tool({
      description:
        "List khata dues that are coming due soon (within the shop's reminder window), with who owes and when. Also returns the reminder lead-day setting.",
      inputSchema: z.object({}),
      execute: async () => {
        const [reminders, leadDays] = await Promise.all([
          getKhataReminders(accessToken),
          getReminderLeadDays(accessToken),
        ]);
        return { reminders, leadDays };
      },
    }),

    // ── Business analytics ────────────────────────────────────────────────────
    getBusinessSummary: tool({
      description:
        "Get the shop's business overview: this month's revenue and order count, total outstanding dues, customer and supplier counts, plus catalog health (products, low/out-of-stock, total units).",
      inputSchema: z.object({}),
      execute: async () => {
        const [financial, catalog] = await Promise.all([
          getFinancialSummary(accessToken),
          getCatalogSummary(accessToken),
        ]);
        return { financial, catalog };
      },
    }),

    getRevenueTrend: tool({
      description:
        "Get completed-order revenue per month for the last N months (default 6), for trend questions like 'how has revenue changed'.",
      inputSchema: z.object({ months: z.number().int().min(1).max(24).default(6) }),
      execute: async ({ months }) => getRevenueTrend(accessToken, months),
    }),

    getPaymentBreakdown: tool({
      description:
        "Get this month's completed-order revenue split by how it was paid: cash, partial, and credit (udhaar).",
      inputSchema: z.object({}),
      execute: async () => getPaymentBreakdown(accessToken),
    }),

    navigateTo: tool({
      description:
        "Open the most relevant screen or dialog for the user after answering. Call this whenever the user's request points at a specific customer, order, or section. customerProfile opens a customer's profile; receipt opens an order receipt; route navigates to a section page.",
      inputSchema: z.object({
        target: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("customerProfile"), customerId: z.string().uuid() }),
          z.object({ kind: z.literal("receipt"), orderId: z.string().uuid() }),
          z.object({ kind: z.literal("route"), path: z.enum(ASSISTANT_ROUTES) }),
        ]),
      }),
      // No DB work — the client interprets the returned target.
      execute: async ({ target }) => target,
    }),
  };

  if (isSuperAdmin) return all;

  // Admins only get catalog + stock lookups. Everything financial/relational —
  // revenue, dues, khata, customers, orders, suppliers, supplier-orders,
  // staff/salary, team accounts — is withheld.
  const { semanticSearch, searchItems, getItemStock, listLowStock, listCategories, navigateTo } =
    all;
  return { semanticSearch, searchItems, getItemStock, listLowStock, listCategories, navigateTo };
}

export type AssistantTools = ReturnType<typeof buildTools>;
