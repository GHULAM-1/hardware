/**
 * Shared contract between the AI assistant (server) and the UI (client).
 * The assistant's `navigateTo` tool emits one of these targets; the client maps
 * each to an existing dialog or route (see lib/assistant-nav.ts). Kept in one
 * place so the server toolset and the client mapper never drift.
 */

/** Read-only app routes the assistant is allowed to send the user to. */
export const ASSISTANT_ROUTES = [
  "/dashboard",
  "/pricing",
  "/warehouse",
  "/customers",
  "/orders",
  "/khata",
  "/suppliers",
] as const;

export type AssistantRoute = (typeof ASSISTANT_ROUTES)[number];

export type NavigateTarget =
  | { kind: "customerProfile"; customerId: string }
  | { kind: "receipt"; orderId: string }
  | { kind: "route"; path: AssistantRoute };
