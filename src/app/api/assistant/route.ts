import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel } from "@/server/ai/provider";
import { buildTools } from "@/server/ai/tools";
import { systemPrompt } from "@/server/ai/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { messages: UIMessage[]; language?: "en" | "ur" };

/**
 * The assistant endpoint. We don't use @supabase/ssr, so the browser forwards its
 * access token as a Bearer header; we bind the toolset to it so every read runs
 * RLS-scoped. The model plans over the tools (vector search + relational reads)
 * and may emit a navigateTo tool call that the client turns into UI navigation.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages, language = "en" }: Body = await request.json();

  const result = streamText({
    model: chatModel(),
    system: systemPrompt(language),
    messages: await convertToModelMessages(messages),
    tools: buildTools(token),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
