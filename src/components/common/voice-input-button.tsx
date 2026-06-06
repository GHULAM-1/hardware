"use client";

import * as React from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth-token";

type Status = "idle" | "recording" | "transcribing";

/**
 * A small mic button that records a short clip and transcribes it via OpenAI
 * Whisper (/api/transcribe), pinned to the current UI language so Urdu speech is
 * written back in Urdu (اردو) script — not Roman. The transcribed text is handed
 * to `onText`; the caller decides how to merge it (we append to existing notes).
 *
 * Tap to start, tap again to stop. Falls back gracefully: if the mic is blocked
 * or unavailable, it toasts and stays idle so the user can just type instead.
 */
export function VoiceInputButton({
  onText,
  className,
}: {
  onText: (text: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<Status>("idle");

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // Stop any in-flight recording on unmount.
  React.useEffect(
    () => () => {
      const r = recorderRef.current;
      if (r && r.state !== "inactive") r.stop();
      r?.stream.getTracks().forEach((tk) => tk.stop());
    },
    [],
  );

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t("voice.unsupported"));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(t("voice.micDenied"));
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((tk) => tk.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      void send(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }

  function stop() {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      setStatus("transcribing");
      r.stop();
    }
  }

  async function send(blob: Blob) {
    if (blob.size === 0) {
      setStatus("idle");
      return;
    }
    try {
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("audio", blob, "note.webm");
      // Notes are always written in Urdu script, whatever the UI language, so the
      // shopkeeper's spoken Urdu is never forced into English/Roman by Whisper.
      fd.append("lang", "ur");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(String(res.status));
      const { text } = (await res.json()) as { text?: string };
      const value = text?.trim();
      if (value) onText(value);
      else toast.info(t("voice.nothingHeard"));
    } catch {
      toast.error(t("voice.failed"));
    } finally {
      setStatus("idle");
    }
  }

  const recording = status === "recording";
  const busy = status === "transcribing";
  const label = recording
    ? t("voice.stop")
    : busy
      ? t("voice.transcribing")
      : t("voice.speak");

  return (
    <button
      type="button"
      onClick={recording ? stop : busy ? undefined : start}
      disabled={busy}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
        recording
          ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        busy && "cursor-wait opacity-70",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
