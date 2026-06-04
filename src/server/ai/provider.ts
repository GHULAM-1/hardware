import "server-only";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { EmbeddingModel, LanguageModel } from "ai";

/**
 * Single source of truth for the assistant's models. Calls the provider's own API
 * directly using its API key (OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY) — no
 * gateway. AI_PROVIDER (openai | google) switches both the reasoning model and the
 * embedding model.
 *
 * Both embedding models are pinned to 1536 dimensions so the pgvector column
 * (vector(1536)) and match_items RPC stay identical regardless of provider.
 * NOTE: query and stored embeddings must come from the SAME provider — re-run
 * scripts/embed-items.mjs after switching AI_PROVIDER.
 */
export const EMBEDDING_DIMENSIONS = 1536;

const CHAT = { openai: "gpt-4o-mini", google: "gemini-2.0-flash" } as const;
const EMBED = { openai: "text-embedding-3-small", google: "gemini-embedding-001" } as const;

type Provider = keyof typeof CHAT;

export function activeProvider(): Provider {
  return process.env.AI_PROVIDER === "google" ? "google" : "openai";
}

/** The reasoning model (switchable via AI_PROVIDER). */
export function chatModel(): LanguageModel {
  const p = activeProvider();
  return p === "google" ? google(CHAT.google) : openai(CHAT.openai);
}

/** The embedding model (switchable via AI_PROVIDER, pinned to 1536 dims). */
export function embeddingModel(): EmbeddingModel {
  const p = activeProvider();
  return p === "google"
    ? google.textEmbeddingModel(EMBED.google)
    : openai.textEmbeddingModel(EMBED.openai);
}

/** Provider-specific options that force the 1536-dim output. */
export function embeddingProviderOptions(): Record<string, Record<string, number>> {
  return activeProvider() === "google"
    ? { google: { outputDimensionality: EMBEDDING_DIMENSIONS } }
    : { openai: { dimensions: EMBEDDING_DIMENSIONS } };
}
