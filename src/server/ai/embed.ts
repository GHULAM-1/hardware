import "server-only";
import { embed } from "ai";

import { embeddingModel, embeddingProviderOptions } from "./provider";

/** Embed a single piece of text into a 1536-dim vector (provider-pinned). */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(),
    value: text,
    providerOptions: embeddingProviderOptions(),
  });
  return embedding;
}

/** pgvector accepts its text form `[0.1,0.2,...]`; the generated RPC type expects a string. */
export function toVectorLiteral(embedding: number[]): string {
  return JSON.stringify(embedding);
}
