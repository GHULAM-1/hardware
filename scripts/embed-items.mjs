// Backfill / refresh item embeddings for the AI assistant's semantic search.
// Embeds every item (bilingual name + sku + category) with the active provider's
// embedding model (pinned to 1536 dims), then upserts into public.item_embeddings.
// Idempotent — safe to re-run after catalog edits or after switching AI_PROVIDER.
//
// Run with:
//   node --env-file=.env.local scripts/embed-items.mjs
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//           and OPENAI_API_KEY (openai) or GOOGLE_GENERATIVE_AI_API_KEY (google).
import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Mirror src/server/ai/provider.ts so the backfill matches what the app queries.
const EMBEDDING_DIMENSIONS = 1536;
const PROVIDER = process.env.AI_PROVIDER === "google" ? "google" : "openai";
const BATCH = 96; // stay well under provider per-request limits

const embeddingModel =
  PROVIDER === "google"
    ? google.textEmbeddingModel("gemini-embedding-001")
    : openai.textEmbeddingModel("text-embedding-3-small");

const embeddingProviderOptions =
  PROVIDER === "google"
    ? { google: { outputDimensionality: EMBEDDING_DIMENSIONS } }
    : { openai: { dimensions: EMBEDDING_DIMENSIONS } };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const providerKey =
  PROVIDER === "google" ? "GOOGLE_GENERATIVE_AI_API_KEY" : "OPENAI_API_KEY";
if (!process.env[providerKey]) {
  console.error(`Missing ${providerKey} (required for AI_PROVIDER=${PROVIDER})`);
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Text we embed for an item — the same signal the shopkeeper would speak/type. */
function itemContent(item, categoryName) {
  return [item.name_en, item.name_ur, item.sku, categoryName]
    .filter(Boolean)
    .join(" · ");
}

async function main() {
  const { data: categories, error: ce } = await db.from("categories").select("id, name");
  if (ce) throw ce;
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const { data: items, error } = await db
    .from("items")
    .select("id, name_en, name_ur, sku, category_id");
  if (error) throw error;
  if (!items?.length) {
    console.log("No items to embed.");
    return;
  }

  let done = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const contents = slice.map((it) => itemContent(it, catName.get(it.category_id)));

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: contents,
      providerOptions: embeddingProviderOptions,
    });

    const rows = slice.map((it, j) => ({
      item_id: it.id,
      content: contents[j],
      embedding: embeddings[j],
    }));

    const { error: upErr } = await db.from("item_embeddings").upsert(rows, { onConflict: "item_id" });
    if (upErr) throw upErr;

    done += slice.length;
    console.log(`Embedded ${done}/${items.length}`);
  }

  console.log("\n✅ Item embeddings up to date");
}

main().catch((e) => {
  console.error("Embed failed:", e.message ?? e);
  process.exit(1);
});
