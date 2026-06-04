import { supabase } from "@/lib/supabaseClient";

/**
 * Resolve the current user's access token for forwarding to Server Actions.
 * Server actions build an RLS-scoped client from this (see lib/supabase/server.ts).
 */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}
