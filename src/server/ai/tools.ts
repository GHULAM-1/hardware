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
import { getReminderLeadDays } from "@/server/actions/settings";
import {
  getDashboardStats,
  getCatalogSummary,
  getFinancialSummary,
  getRevenueTrend,
  getPaymentBreakdown,
} from "@/server/actions/dashboard";
import { KhataStatus } from "@/lib/enums";
import { LOW_STOCK_THRESHOLD } from "@/lib/status-meta";
import { ASSISTANT_ROUTES } from "@/types/assistant";

/**
 * Build the assistant's read-only toolset, bound to the caller's access token so
 * every query runs RLS-scoped (the assistant only sees what the user may see).
 * Each structured tool reuses an existing server action — no duplicated queries.
 * pgvector (semanticSearch) resolves fuzzy/bilingual references; the rest fetch
 * authoritative relational facts.
 */
export function buildTools(accessToken: string) {
  return {
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
          unit: i.unit,
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
          unit: found.unit,
          quantity: found.quantity,
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
          .filter((i) => i.quantity <= LOW_STOCK_THRESHOLD)
          .map((i) => ({
            id: i.id,
            name_en: i.name_en,
            name_ur: i.name_ur,
            unit: i.unit,
            quantity: i.quantity,
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

    // ── Staff / users (owner-only) ────────────────────────────────────────────
    listStaff: tool({
      description:
        "List staff accounts with their role (owner/super_admin or admin) and active status. Only the owner can read this.",
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
}

export type AssistantTools = ReturnType<typeof buildTools>;
