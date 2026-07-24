// Same job as scripts/seed-admin.mjs, but over plain REST so it works on Node 20
// (supabase-js pulls in realtime-js, which needs native WebSocket => Node 22+).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ROLE = process.env.SEED_ADMIN_ROLE ?? "super_admin";
const FULL_NAME = process.env.SEED_ADMIN_NAME ?? "Super Admin";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function main() {
  // 1. Create the auth user (or find it if it already exists).
  let userId;
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });
  const created = await createRes.json();

  if (createRes.ok && created.id) {
    userId = created.id;
    console.log("Created auth user:", EMAIL);
  } else if (/already|exists|registered/i.test(JSON.stringify(created))) {
    const listRes = await fetch(
      `${url}/auth/v1/admin/users?per_page=1000`,
      { headers },
    );
    const list = await listRes.json();
    userId = list.users?.find((u) => u.email === EMAIL)?.id;
    if (!userId) throw new Error("User exists but could not be located");
    console.log("Auth user already existed:", EMAIL);
  } else {
    throw new Error(`createUser failed: ${JSON.stringify(created)}`);
  }

  // 2. Upsert the profile row (service role bypasses RLS).
  const profRes = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ id: userId, full_name: FULL_NAME, role: ROLE, is_active: true }),
  });
  const prof = await profRes.json();
  if (!profRes.ok) throw new Error(`profile upsert failed: ${JSON.stringify(prof)}`);

  console.log("\n✅ Admin ready");
  console.log("   id:      ", userId);
  console.log("   email:   ", EMAIL);
  console.log("   password:", PASSWORD);
  console.log("   role:    ", ROLE);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
