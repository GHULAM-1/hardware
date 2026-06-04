import "server-only";
import { tool } from "ai";
import { z } from "zod";

import { createActionClient } from "@/lib/supabase/server";
import { embedText, toVectorLiteral } from "@/server/ai/embed";
import { listCustomers, getCustomerOrders, getLastPurchase } from "@/server/actions/customers";
import { listItems } from "@/server/actions/items";
import { listItemsWithStock } from "@/server/actions/warehouse";
import { listOrders, getOrderReceipt } from "@/server/actions/orders";
import { listKhatas } from "@/server/actions/khata";
import { getDashboardStats } from "@/server/actions/dashboard";
import { KhataStatus } from "@/lib/enums";
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
