"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The page numbers to render, with "dots" markers where the run is elided.
 * Always keeps the first and last page plus a window of `siblings` around the
 * current one, so the control stays a fixed width no matter the page count.
 */
function pageList(current: number, count: number, siblings = 1): (number | "dots")[] {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // first + last + current + siblings each side + two dots' worth of slack.
  const totalBlocks = siblings * 2 + 5;
  if (count <= totalBlocks) return range(1, count);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, count);
  const showLeftDots = left > 2;
  const showRightDots = right < count - 1;
  const edge = 3 + siblings * 2;

  if (!showLeftDots && showRightDots) return [...range(1, edge), "dots", count];
  if (showLeftDots && !showRightDots) return [1, "dots", ...range(count - edge + 1, count)];
  return [1, "dots", ...range(left, right), "dots", count];
}

/**
 * Themed pager for the list pages. Client-side: the parent slices its rows and
 * owns the page number. Renders the "showing X–Y of Z" summary, prev/next arrows
 * (RTL-aware) and elided page numbers. Hidden by the parent when there's one page.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  /** Total row count across all pages, for the summary. */
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;

  const go = (p: number) => onPageChange(Math.min(Math.max(p, 1), pageCount));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav
      role="navigation"
      aria-label={t("pagination.label")}
      className={cn(
        "mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("pagination.showing", { from, to, total })}
      </p>

      {/* Inset themed "well" (matches the saturated chrome) instead of the old
          translucent bg-muted bar, with a raised gold active page. */}
      <div className="well inline-flex items-center gap-1 rounded-xl p-1.5">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label={t("pagination.previous")}
          title={t("pagination.previous")}
          className={arrow}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>

        {pageList(page, pageCount).map((p, i) =>
          p === "dots" ? (
            <span
              key={`dots-${i}`}
              aria-hidden
              className="flex h-8 w-8 items-center justify-center text-sm text-white/55"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-label={t("pagination.goToPage", { page: p })}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-bold tabular-nums transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_0_rgba(0,0,0,0.3)]"
                  : "text-white/80 hover:bg-white/15 hover:text-white",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          aria-label={t("pagination.next")}
          title={t("pagination.next")}
          className={arrow}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </nav>
  );
}
