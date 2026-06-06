"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getAccessToken } from "@/lib/auth-token";

export type ReadAloudStatus = "idle" | "loading" | "playing";

/**
 * Shared "read aloud" engine for the select-text pill AND the per-section speaker
 * buttons. A single module-level audio is coordinated across every instance, so
 * only one thing speaks at a time (starting a new one stops the previous), and
 * each caller reflects only its OWN state via a per-instance id.
 *
 * Audio is generated server-side (/api/tts) in the current UI language so it
 * works on any device and speaks Urdu in an Urdu voice.
 */
type Active = { id: symbol; status: "loading" | "playing"; audio: HTMLAudioElement | null };

let active: Active | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function clearActive() {
  if (active?.audio) {
    active.audio.pause();
    if (active.audio.src) URL.revokeObjectURL(active.audio.src);
  }
  active = null;
  notify();
}

export function useReadAloud() {
  const { t, i18n } = useTranslation();
  const [id] = React.useState(() => Symbol("read-aloud"));
  const [, force] = React.useReducer((c: number) => c + 1, 0);

  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
      // Stop playback if this instance was the one speaking (e.g. dialog closed).
      if (active?.id === id) clearActive();
    };
  }, [id]);

  const status: ReadAloudStatus = active?.id === id ? active.status : "idle";

  const stop = React.useCallback(() => {
    if (active?.id === id) clearActive();
  }, [id]);

  const play = React.useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;
      clearActive();
      active = { id, status: "loading", audio: null };
      notify();
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify({
            text: value,
            lang: i18n.language?.startsWith("ur") ? "ur" : "en",
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        // Bail if another request superseded us while fetching.
        if (active?.id !== id || active.status !== "loading") return;

        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        const done = () => {
          URL.revokeObjectURL(url);
          if (active?.audio === audio) {
            active = null;
            notify();
          }
        };
        audio.onended = done;
        audio.onerror = done;
        active = { id, status: "playing", audio };
        notify();
        await audio.play();
      } catch {
        if (active?.id === id) {
          active = null;
          notify();
        }
        toast.error(t("common.ttsError"));
      }
    },
    [id, i18n, t],
  );

  const toggle = React.useCallback(
    (text: string) => {
      if (active?.id === id) stop();
      else void play(text);
    },
    [id, play, stop],
  );

  return { status, play, stop, toggle };
}
