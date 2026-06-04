// Seed a dev super_admin. Run with:
//   node --env-file=.env.local scripts/seed-admin.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@hardware.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Hardware@123";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Create (or find) the auth user.
  let userId;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (createErr) {
    if (!/already.*registered|exists/i.test(createErr.message)) throw createErr;
    // Already exists — look it up.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    userId = list.users.find((u) => u.email === EMAIL)?.id;
    if (!userId) throw new Error("User exists but could not be located");
    console.log("Auth user already existed:", EMAIL);
  } else {
    userId = created.user.id;
    console.log("Created auth user:", EMAIL);
  }

  // Upsert the profile as super_admin (bypasses RLS via service role).
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: "Super Admin",
      role: "super_admin",
      is_active: true,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw profileErr;

  console.log("\n✅ Super admin ready");
  console.log("   email:   ", EMAIL);
  console.log("   password:", PASSWORD);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
