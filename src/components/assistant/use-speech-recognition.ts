"use client";

import * as React from "react";

import { Language } from "@/lib/enums";
import { useLanguage } from "@/providers/i18n-provider";

/** BCP-47 tag the recognizer listens in, following the app language. */
const LANG_TAG: Record<Language, string> = {
  [Language.English]: "en-US",
  [Language.Urdu]: "ur-PK",
};

function getImpl(): SpeechRecognitionStatic | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/**
 * Browser speech-to-text wrapper. Transcribes one utterance in the current app
 * language and hands the text to `onResult`. Degrades gracefully: when the API
 * is unavailable, `supported` is false and the UI falls back to typing.
 */
export function useSpeechRecognition(onResult: (text: string) => void) {
  const { language } = useLanguage();
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef<SpeechRecognition | null>(null);

  // Keep the latest callback without re-creating start().
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  });

  const supported = React.useMemo(() => Boolean(getImpl()), []);

  const stop = React.useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    const Impl = getImpl();
    if (!Impl) return;

    const rec = new Impl();
    rec.lang = LANG_TAG[language];
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onResultRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [language]);

  // Abort any in-flight recognition on unmount.
  React.useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, start, stop };
}
