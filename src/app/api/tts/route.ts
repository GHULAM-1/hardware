import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cloud text-to-speech for the "select text → read aloud" feature. Uses OpenAI's
 * speech model so it works on ANY device/browser — independent of whatever voices
 * are (or aren't) installed locally, and it speaks Urdu. Requires the caller's
 * session token (gated to logged-in users).
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { text } = (await request.json()) as { text?: string };
  const value = text?.trim();
  if (!value) {
    return Response.json({ error: "No text" }, { status: 400 });
  }

  const { audio } = await generateSpeech({
    model: openai.speech("gpt-4o-mini-tts"),
    text: value.slice(0, 4000), // cap length (cost/abuse guard)
    voice: "alloy",
    outputFormat: "mp3",
  });

  return new Response(new Uint8Array(audio.uint8Array), {
    headers: {
      "Content-Type": audio.mediaType || "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
