import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel } from "@/server/ai/provider";
import { buildTools } from "@/server/ai/tools";
import { systemPrompt } from "@/server/ai/system-prompt";
import { createActionClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/enums";

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

  // Determine the caller's role from their token (never the client) so admins
  // get a restricted toolset + prompt — they can't ask the assistant for data
  // their dashboard hides (revenue, dues, customers, suppliers, staff…).
  const supabase = createActionClient(token);
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user?.id ?? "")
    .maybeSingle();
  const isSuperAdmin = profile?.role === UserRole.SuperAdmin;

  const result = streamText({
    model: chatModel(),
    system: systemPrompt(language, isSuperAdmin),
    messages: await convertToModelMessages(messages),
    tools: buildTools(token, isSuperAdmin),
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
