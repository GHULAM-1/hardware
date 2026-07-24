"use client";

import { getAccessToken } from "@/lib/auth-token";
// Type-only: erased at compile time, so no server module is ever bundled here.
import type { ReadArgs, ReadOp, ReadResult } from "@/server/read-registry";

/**
 * Call a registered read over HTTP.
 *
 * Replaces calling Server Actions directly from React Query. Next.js dispatches
 * Server Functions from the client one at a time, so a screen with several
 * queries paid their latency back-to-back; a Route Handler is ordinary fetch and
 * the browser overlaps them. Same functions, same RLS, same return types — only
 * the transport changed.
 *
 * Typed against the registry, so `read("items.list", search)` checks its
 * arguments and infers its result exactly like the direct call did.
 */
export async function read<K extends ReadOp>(
  op: K,
  ...args: ReadArgs<K>
): Promise<ReadResult<K>> {
  const token = await getAccessToken();
  const res = await fetch("/api/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ op, args }),
  });

  const payload = (await res.json().catch(() => null)) as
    | { data?: unknown; error?: string }
    | null;

  if (!res.ok) {
    throw new Error(payload?.error ?? `Request failed (${res.status})`);
  }
  return payload?.data as ReadResult<K>;
}
