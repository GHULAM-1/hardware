"use client";

import * as React from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getAccessToken } from "@/lib/auth-token";

type Anchor = { top: number; left: number };
type Status = "idle" | "loading" | "playing";

/**
 * Select any text on the page → a floating speaker button appears near the
 * selection → click it to hear it read aloud. Audio is generated server-side via
 * cloud TTS (/api/tts), so it works on every device/browser and speaks Urdu —
 * no dependence on voices installed on the local machine. Mounted once globally.
 */
export function SelectionReader() {
  const { t } = useTranslation();
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (audio.src) URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    setStatus("idle");
  }, []);

  const hide = React.useCallback(() => {
    setAnchor(null);
    setText("");
  }, []);

  React.useEffect(() => {
    // Show the button when a non-empty text selection settles.
    function refresh() {
      const sel = window.getSelection();
      const value = sel?.toString().trim() ?? "";
      if (!sel || sel.rangeCount === 0 || !value) return;

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      setText(value);
      setAnchor({ top: rect.top, left: rect.left + rect.width / 2 });
    }

    // Hide (and stop) when the selection is cleared.
    function onSelectionChange() {
      const value = window.getSelection()?.toString().trim() ?? "";
      if (!value) {
        hide();
        stop();
      }
    }

    document.addEventListener("mouseup", refresh);
    document.addEventListener("keyup", refresh);
    document.addEventListener("selectionchange", onSelectionChange);
    // Position is viewport-relative; on scroll it goes stale, so just hide.
    window.addEventListener("scroll", hide, true);

    return () => {
      document.removeEventListener("mouseup", refresh);
      document.removeEventListener("keyup", refresh);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", hide, true);
    };
  }, [hide, stop]);

  // Stop any playback when unmounting.
  React.useEffect(() => () => stop(), [stop]);

  async function play() {
    setStatus("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(await res.text());

      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setStatus("idle");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus("idle");
      };
      await audio.play();
      setStatus("playing");
    } catch {
      setStatus("idle");
      toast.error(t("common.ttsError"));
    }
  }

  if (!anchor) return null;

  const busy = status === "loading";
  const playing = status === "playing";

  return (
    <button
      type="button"
      // Keep the selection while interacting with the button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (playing || busy) stop();
        else void play();
      }}
      title={playing ? t("common.stopReading") : t("common.readAloud")}
      aria-label={playing ? t("common.stopReading") : t("common.readAloud")}
      style={{
        position: "fixed",
        top: anchor.top,
        left: anchor.left,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
      className="z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-popover text-popover-foreground shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Square className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}
