import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service-role client — bypasses RLS. Use ONLY for privileged operations that
 * cannot run as the user: creating auth users (provisioning) and seeding.
 * Never import this into client components.
 */
export function createAdminClient() {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
