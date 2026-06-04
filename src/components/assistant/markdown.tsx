"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";

/** Urdu/Arabic block — used to flip a message bubble to RTL when it contains Urdu. */
const RTL_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function isRtlText(text: string): boolean {
  return RTL_RANGE.test(text);
}

/** Compact markdown styling tuned for chat bubbles (bold, lists, code). */
const components: Components = {
  p: (props) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="my-1.5 list-disc space-y-1 ps-5" {...props} />,
  ol: (props) => <ol className="my-1.5 list-decimal space-y-1 ps-5" {...props} />,
  li: (props) => <li className="leading-relaxed [&>p]:mb-0" {...props} />,
  a: (props) => <a className="font-medium underline underline-offset-2" {...props} />,
  code: (props) => (
    <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  h1: (props) => <p className="mb-1 font-semibold" {...props} />,
  h2: (props) => <p className="mb-1 font-semibold" {...props} />,
  h3: (props) => <p className="mb-1 font-semibold" {...props} />,
  hr: () => <hr className="my-2 border-border" />,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
