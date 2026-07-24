import { NextRequest, NextResponse } from "next/server";

import { READS, type ReadOp } from "@/server/read-registry";

/**
 * Single read endpoint for the client data layer.
 *
 * Reads go over plain HTTP rather than Server Actions so the browser can run
 * them CONCURRENTLY — Next.js dispatches Server Functions from the client one at
 * a time, which serialized every screen's queries (see the note in
 * node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md).
 *
 * Auth: the caller's Supabase access token arrives as a Bearer header and is
 * passed straight through to the action, which builds an RLS-scoped client from
 * it. The server holds no session and grants nothing on its own — an invalid or
 * missing token simply fails against RLS, exactly as before.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { op?: string; args?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  // Allow-list lookup: an unknown op is rejected before anything is invoked, so
  // the client can never reach a server function that isn't registered.
  const op = body.op as ReadOp | undefined;
  if (!op || !Object.hasOwn(READS, op)) {
    return NextResponse.json({ error: `Unknown read op: ${String(op)}` }, { status: 400 });
  }

  const fn = READS[op] as (token: string, ...args: unknown[]) => Promise<unknown>;
  try {
    const data = await fn(token, ...(body.args ?? []));
    return NextResponse.json({ data });
  } catch (err) {
    // Surface the action's message (RLS denials, validation) without a stack.
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
