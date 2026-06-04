"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslation } from "react-i18next";
import { Loader2, Mic, Send, Square } from "lucide-react";

import { getAccessToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/i18n-provider";
import { useAssistantNavigate } from "@/lib/assistant-nav";
import { useSpeechRecognition } from "@/components/assistant/use-speech-recognition";
import { Markdown, isRtlText } from "@/components/assistant/markdown";
import type { NavigateTarget } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Concatenate the visible text of a message (ignoring tool parts). */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function AssistantPanel({ onNavigated }: { onNavigated?: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useAssistantNavigate();

  const [input, setInput] = React.useState("");

  // Rebuilt when the language changes so replies follow the active language.
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        prepareSendMessagesRequest: async ({ messages }) => ({
          headers: { Authorization: `Bearer ${await getAccessToken()}` },
          body: { messages, language },
        }),
      }),
    [language],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  // Run a navigateTo tool result exactly once, then let the caller close the panel.
  const processed = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (part.type === "tool-navigateTo" && part.state === "output-available") {
          if (processed.current.has(part.toolCallId)) continue;
          processed.current.add(part.toolCallId);
          void navigate(part.output as NavigateTarget);
          onNavigated?.();
        }
      }
    }
  }, [messages, navigate, onNavigated]);

  const submit = React.useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value) return;
      setInput("");
      void sendMessage({ text: value });
    },
    [sendMessage],
  );

  // Voice: transcribe in the app language and send immediately.
  const { supported: micSupported, listening, start, stop } = useSpeechRecognition(submit);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="flex h-[60vh] max-h-[560px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Mic className="h-8 w-8 opacity-50" />
            <p className="text-sm">{t("assistant.empty")}</p>
            <p className="text-xs">{t("assistant.exampleHint")}</p>
          </div>
        ) : (
          messages.map((m) => {
            const text = messageText(m);
            if (!text) return null;
            const isUser = m.role === "user";
            const rtl = isRtlText(text);
            return (
              <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  dir={rtl ? "rtl" : "ltr"}
                  style={
                    rtl
                      ? { fontFamily: "var(--font-urdu), var(--font-geist-sans), sans-serif" }
                      : undefined
                  }
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    rtl ? "text-right leading-loose" : "text-left",
                    isUser
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                  ) : (
                    <Markdown>{text}</Markdown>
                  )}
                </div>
              </div>
            );
          })
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("assistant.thinking")}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{t("assistant.error")}</p>}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        {micSupported && (
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon"
            className="shrink-0"
            title={t(listening ? "assistant.listening" : "assistant.speak")}
            onClick={() => (listening ? stop() : start())}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(listening ? "assistant.listening" : "assistant.placeholder")}
          disabled={busy}
          autoFocus
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
