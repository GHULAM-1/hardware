import "server-only";

import { createActionClient } from "@/lib/supabase/server";

/**
 * Shared helper for Server Actions: build the RLS-scoped client from the caller's
 * token, run the query, and throw a clean Error on failure. Keeps every action tiny.
 */
export async function runQuery<T>(
  accessToken: string,
  fn: (
    client: ReturnType<typeof createActionClient>,
  ) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const client = createActionClient(accessToken);
  const { data, error } = await fn(client);
  if (error) throw new Error(error.message);
  return data as T;
}
