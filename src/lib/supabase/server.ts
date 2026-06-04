import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Request-scoped client for Server Actions. We don't use @supabase/ssr, so the
 * session lives in the browser; the caller passes its access token and we forward
 * it as a Bearer header. RLS (is_super_admin / is_active_user) is then enforced
 * server-side against the real user.
 */
export function createActionClient(accessToken: string) {
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
