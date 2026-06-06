import { experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cloud speech-to-text for voice note entry. Uses OpenAI Whisper so Urdu speech is
 * written back in proper Urdu (اردو) script — NOT Roman Urdu, which is what the
 * browser's built-in SpeechRecognition tends to produce. The caller records a short
 * audio clip and posts it here with the UI language; we pin Whisper to that language
 * so the transcript comes back in the right script. Gated to logged-in users.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("audio");
  const lang = String(form.get("lang") ?? "en");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "No audio" }, { status: 400 });
  }
  // Guard against oversized uploads (~25MB is Whisper's own limit; we cap lower).
  if (file.size > 15 * 1024 * 1024) {
    return Response.json({ error: "Audio too large" }, { status: 413 });
  }

  const audio = new Uint8Array(await file.arrayBuffer());
  // Force the recognition language so Urdu transcribes to Urdu script, not Roman.
  const language = lang === "ur" ? "ur" : "en";

  try {
    const { text } = await transcribe({
      model: openai.transcription("whisper-1"),
      audio,
      providerOptions: { openai: { language } },
    });
    return Response.json({ text: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
