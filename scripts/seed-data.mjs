// Seed a complete, FK-consistent demo dataset for the Hardware Shop CRM.
// Pakistani shop context: bilingual items, real-looking suppliers/customers,
// stock movements, and orders (cash / partial / credit) created through the
// real create_order RPC so totals and Khata stay correct.
//
// Run with:
//   node --env-file=.env.local scripts/seed-data.mjs
//
// Additive by default — it only INSERTS, leaving any existing rows in place.
// To start from a clean slate, run with SEED_RESET=1 to first TRUNCATE all
// business tables (categories…orders…khatas, item_embeddings). Auth users,
// profiles and app_settings are never touched.
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//           SUPABASE_SERVICE_ROLE_KEY. SUPABASE_ACCESS_TOKEN only for SEED_RESET=1.
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "vfdmndkeiqnblxzmjwnm";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@hardware.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Hardware@123";
const RESET = process.env.SEED_RESET === "1";

const required = { url, anonKey, serviceKey, ...(RESET ? { accessToken } : {}) };
for (const [k, v] of Object.entries(required)) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Run raw SQL via the Management API (used only for the truncate/reset). */
async function runSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (r.status >= 300) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}

const today = new Date();
const daysFromNow = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Dataset ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  ["Hand Tools", "Manual tools — hammers, wrenches, screwdrivers"],
  ["Power Tools", "Electric drills, grinders, saws"],
  ["Plumbing", "Pipes, taps, fittings"],
  ["Electrical", "Wires, switches, lighting"],
  ["Paint & Chemicals", "Paints, brushes, adhesives"],
  ["Fasteners", "Screws, nails, bolts"],
  ["Building Material", "Cement, steel, blocks"],
  ["Safety Gear", "Helmets, gloves, goggles"],
];

const SUPPLIERS = [
  ["Al-Hamd Hardware Traders", "+92 300 1234567", "Brandreth Road, Lahore — hand & power tools"],
  ["Bismillah Steel & Pipe House", "+92 321 2345678", "Badami Bagh, Lahore — steel rods, pipes"],
  ["Karachi Tools Depot", "+92 333 3456789", "Sher Shah, Karachi — imported power tools"],
  ["Lahore Electric House", "+92 301 4567890", "Hall Road, Lahore — wires, switches, bulbs"],
  ["Faisal Paints & Chemicals", "+92 345 5678901", "Faisalabad — paints, brushes, thinner"],
  ["New Madina Sanitary Store", "+92 312 6789012", "Misri Shah, Lahore — taps, sanitary fittings"],
  ["Pak Fasteners & Bolts", "+92 302 7890123", "Gujranwala — screws, nails, nuts & bolts"],
];

// [name_en, name_ur, category, unit, selling_price, supplierIndex, buying_price]
const ITEMS = [
  ["Claw Hammer", "ہتھوڑا", "Hand Tools", "pcs", 650, 0, 470],
  ["Screwdriver Set (6 pcs)", "پیچ کش سیٹ", "Hand Tools", "set", 850, 0, 620],
  ["Measuring Tape 5m", "پیمائشی فیتہ", "Hand Tools", "pcs", 350, 0, 240],
  ["Adjustable Wrench 10\"", "پانا", "Hand Tools", "pcs", 700, 0, 520],
  ["Electric Drill 13mm", "بجلی کی ڈرل", "Power Tools", "pcs", 8500, 2, 6800],
  ["Angle Grinder 4\"", "اینگل گرائنڈر", "Power Tools", "pcs", 6500, 2, 5200],
  ["PVC Pipe 1 inch", "پی وی سی پائپ", "Plumbing", "meter", 120, 5, 80],
  ["Pipe Wrench 14\"", "پائپ پانا", "Plumbing", "pcs", 950, 5, 700],
  ["Water Tap (Brass)", "پانی کا نل", "Plumbing", "pcs", 480, 5, 330],
  ["Copper Wire 7/29 (per m)", "تانبے کی تار", "Electrical", "meter", 95, 3, 68],
  ["Wall Switch 1-Gang", "دیوار سوئچ", "Electrical", "pcs", 110, 3, 70],
  ["LED Bulb 12W", "ایل ای ڈی بلب", "Electrical", "pcs", 250, 3, 165],
  ["Emulsion Paint White 1L", "ایملشن پینٹ سفید", "Paint & Chemicals", "liter", 900, 4, 650],
  ["Paint Brush 3 inch", "پینٹ برش", "Paint & Chemicals", "pcs", 180, 4, 110],
  ["Wood Screws 1.5\" (box)", "لکڑی کے پیچ", "Fasteners", "box", 320, 6, 210],
  ["Steel Nails 2\" (per kg)", "کیلیں", "Fasteners", "kg", 280, 6, 190],
  ["Cement Bag 50kg", "سیمنٹ بوری", "Building Material", "bag", 1350, 1, 1180],
  ["Steel Rod 12mm (Saria)", "سریا", "Building Material", "pcs", 2100, 1, 1850],
  ["Safety Helmet", "حفاظتی ہیلمٹ", "Safety Gear", "pcs", 750, 0, 520],
  ["Hand Gloves (pair)", "دستانے", "Safety Gear", "pair", 220, 0, 140],
];

// [name_en, name_ur, phone, email|null, address]
const CUSTOMERS = [
  ["Muhammad Imran", "محمد عمران", "+92 321 4567890", "imran.malik@gmail.com", "House 12, Gulberg III, Lahore"],
  ["Ayesha Siddiqui", "عائشہ صدیقی", "+92 333 1122334", null, "Flat 4B, North Nazimabad, Karachi"],
  ["Bilal Ahmed", "بلال احمد", "+92 300 9988776", "bilal.contracts@gmail.com", "Shop 7, Hall Road, Lahore"],
  ["Fatima Noor", "فاطمہ نور", "+92 345 5544332", null, "St 9, Satellite Town, Rawalpindi"],
  ["Usman Ghani", "عثمان غنی", "+92 301 7766554", "usman.builder@gmail.com", "Plot 23, DHA Phase 5, Lahore"],
  ["Hassan Raza", "حسن رضا", "+92 312 3344556", null, "Mohalla Islampura, Faisalabad"],
  ["Zainab Khan", "زینب خان", "+92 302 6677889", "zainab.k@gmail.com", "House 88, Model Town, Gujranwala"],
  ["Ali Hamza", "علی حمزہ", "+92 322 1239876", null, "Bazar Road, Sialkot"],
  ["Saad Mehmood", "سعد محمود", "+92 308 4561237", "saad.m@gmail.com", "Cantt Area, Multan"],
  ["Hira Yousaf", "حرا یوسف", "+92 314 7890456", null, "G-11 Markaz, Islamabad"],
];

// Orders: indices into ITEMS for lines. payment ∈ cash|partial|credit.
// [customerIndex, payment, dueOffsetDays|null, partialPaid|null, lines:[[itemIndex, qty]]]
const ORDERS = [
  [0, "cash", null, null, [[16, 20], [17, 10]]], // Imran: cement + saria (construction)
  [4, "credit", 20, null, [[4, 1], [5, 1], [3, 2]]], // Usman builder: tools on credit
  [2, "partial", 12, 3000, [[9, 50], [10, 15], [11, 20]]], // Bilal: electrical, part paid
  [1, "cash", null, null, [[12, 4], [13, 3]]], // Ayesha: paint
  [3, "credit", -5, null, [[6, 30], [8, 4]]], // Fatima: plumbing, OVERDUE (due 5 days ago)
  [6, "partial", 3, 5000, [[16, 30], [17, 12]]], // Zainab: bulk, due soon
  [8, "cash", null, null, [[0, 2], [1, 1], [2, 1], [19, 3]]], // Saad: mixed hand tools
  [5, "credit", 30, null, [[18, 5], [19, 10]]], // Hassan: safety gear
];

async function main() {
  if (RESET) {
    console.log("⏳ SEED_RESET=1 — truncating business tables…");
    await runSql(`
      truncate table
        public.item_embeddings,
        public.khatas,
        public.order_item_suppliers,
        public.order_items,
        public.orders,
        public.stock_entries,
        public.items,
        public.customers,
        public.suppliers,
        public.categories
      restart identity cascade;
      alter sequence public.sku_seq restart with 1;
      alter sequence public.order_no_seq restart with 1;
    `);
  } else {
    console.log("➕ Additive seed (existing rows kept). Use SEED_RESET=1 to wipe first.");
  }

  // Identify the super_admin (for created_by + sign-in for the order RPC).
  const { data: adminProfile, error: pe } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .limit(1)
    .single();
  if (pe) throw pe;
  const adminUid = adminProfile.id;

  // ── Categories ──
  const { data: cats, error: ce } = await admin
    .from("categories")
    .insert(CATEGORIES.map(([name, description]) => ({ name, description })))
    .select("id, name");
  if (ce) throw ce;
  const catId = new Map(cats.map((c) => [c.name, c.id]));
  console.log(`✅ ${cats.length} categories`);

  // ── Suppliers ──
  const { data: sups, error: se } = await admin
    .from("suppliers")
    .insert(SUPPLIERS.map(([name, phone, note]) => ({ name, phone, note })))
    .select("id");
  if (se) throw se;
  console.log(`✅ ${sups.length} suppliers`);

  // ── Items ──
  // Map a seed unit to the measurement model (single source of truth lives on the
  // item). kg → weight (grams), meter → length (mm), everything else → count.
  const measurementFor = (unit) => {
    if (unit === "kg") return { measurement_type: "weight", primary_unit: "kg", base_unit: "gram", base_per_primary: 1000 };
    if (unit === "meter") return { measurement_type: "length", primary_unit: "meter", base_unit: "mm", base_per_primary: 1000 };
    return { measurement_type: "count", primary_unit: "piece", base_unit: "piece", base_per_primary: 1 };
  };

  const { data: items, error: ie } = await admin
    .from("items")
    .insert(
      ITEMS.map(([name_en, name_ur, cat, unit, selling_price]) => ({
        name_en,
        name_ur,
        category_id: catId.get(cat),
        ...measurementFor(unit),
        selling_price,
        track_in_warehouse: true,
      })),
    )
    .select("id, name_en");
  if (ie) throw ie;
  console.log(`✅ ${items.length} items`);

  // ── Stock entries (purchases in, plus a few manual adjustments out) ──
  const stockIn = ITEMS.map((row, idx) => {
    const [, , , unit, , supIdx, buying] = row;
    const primaryQty = unit === "meter" || unit === "kg" ? 200 : 60;
    // stock_entries.quantity is stored in BASE units.
    const qty = primaryQty * measurementFor(unit).base_per_primary;
    return {
      item_id: items[idx].id,
      supplier_id: sups[supIdx].id,
      type: "in",
      quantity: qty,
      buying_price: buying,
      note: null,
      entry_date: daysFromNow(-30 - (idx % 20)),
      created_by: adminUid,
    };
  });
  const stockOut = [
    { idx: 0, qty: 2, note: "Damaged in storage" },
    { idx: 16, qty: 5, note: "Stock correction after audit" },
    { idx: 12, qty: 1, note: "Used as shop sample" },
  ].map(({ idx, qty, note }) => ({
    item_id: items[idx].id,
    supplier_id: null,
    type: "out",
    quantity: qty * measurementFor(ITEMS[idx][3]).base_per_primary,
    buying_price: null,
    note,
    entry_date: daysFromNow(-7),
    created_by: adminUid,
  }));
  const { error: ste } = await admin.from("stock_entries").insert([...stockIn, ...stockOut]);
  if (ste) throw ste;
  console.log(`✅ ${stockIn.length + stockOut.length} stock entries`);

  // ── Customers ──
  const { data: custs, error: cue } = await admin
    .from("customers")
    .insert(
      CUSTOMERS.map(([name_en, name_ur, phone, email, address]) => ({
        name_en,
        name_ur,
        phone,
        email,
        address,
      })),
    )
    .select("id");
  if (cue) throw cue;
  console.log(`✅ ${custs.length} customers`);

  // ── Orders (through the real create_order RPC, as the super_admin) ──
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw new Error(`Sign-in failed (${EMAIL}): ${signInErr.message}`);

  let orderCount = 0;
  for (const [custIdx, payment, dueOffset, partialPaid, lines] of ORDERS) {
    const p_lines = lines.map(([itemIdx, qty]) => {
      const [, , , unit, selling, supIdx, buying] = ITEMS[itemIdx];
      return {
        item_id: items[itemIdx].id,
        quantity: qty,
        unit: measurementFor(unit).primary_unit,
        selling_price: selling,
        suppliers: [{ supplier_id: sups[supIdx].id, quantity: qty, buying_price: buying }],
      };
    });

    const { error: oe } = await userClient.rpc("create_order", {
      p_customer_id: custs[custIdx].id,
      p_payment_type: payment,
      p_amount_paid: payment === "partial" ? partialPaid : 0,
      p_due_date: dueOffset === null ? null : daysFromNow(dueOffset),
      p_lines,
    });
    if (oe) throw new Error(`Order for customer ${custIdx} failed: ${oe.message}`);
    orderCount += 1;
  }
  console.log(`✅ ${orderCount} orders (with auto Khata for partial/credit)`);

  console.log("\n🎉 Seed complete. Next: node --env-file=.env.local scripts/embed-items.mjs");
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
