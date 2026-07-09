"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

/**
 * Theme decor for the dashboard's empty side gutters on wide screens: the AI
 * assistant mascot sits bottom-left (a real, clickable entry point — tapping it
 * opens the assistant), and the hardware-shop signboard hangs top-right (with
 * the live rating + location on its blank face). Sized via the gutter width so
 * nothing crosses into the content, and gone below xl where there's no gutter.
 */
export function DashboardDecor() {
  const { t } = useTranslation();
  // Keep the prop within the gutter: half the viewport minus half the content
  // width (max-w-5xl = 1024px → 512) minus a margin. Clamps to 0 (hidden) when tight.
  const gutter = "min(260px, calc(50vw - 552px))";

  // z-20 (above the z-10 content) so the mascot button is actually clickable in
  // the gutter; the wrapper stays pointer-events-none so it never blocks content.
  return (
    <div className="pointer-events-none fixed inset-0 z-20 hidden select-none xl:block">
      {/* Mascot — the AI assistant, bottom-left. Clicking opens the assistant. */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("assistant:open"))}
        aria-label={t("assistant.title")}
        title={t("assistant.title")}
        className="dash-bob group pointer-events-auto absolute bottom-4 left-3 outline-none"
        style={{ width: gutter }}
      >
        {/* Soft glow behind, so the image's dark edges melt into the scene. */}
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-primary/25 blur-2xl"
        />
        <span className="relative block overflow-hidden rounded-[1.75rem] border-2 border-gold shadow-2xl transition-transform duration-200 group-hover:scale-[1.03] group-focus-visible:ring-4 group-focus-visible:ring-gold">
          <Image
            src="/mascot1.png"
            alt=""
            width={1024}
            height={1536}
            priority
            className="h-auto w-full"
          />
        </span>
        {/* "Ask me!" chat bubble to signal it's interactive. */}
        <span className="pointer-events-none absolute -top-2 end-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink shadow-lg ring-2 ring-gold">
          {t("assistant.askMe")}
        </span>
      </button>

      {/* Signboard — hanging in the top-right gutter, with live info on its face.
          The board scales with the gutter width, so the overlay uses container-query
          units (cqw) to scale too — the text never outgrows the cream face. */}
      <div aria-hidden className="absolute end-2 top-[180px]" style={{ width: gutter }}>
        <div className="dash-sway relative" style={{ containerType: "inline-size" }}>
          <Image
            src="/signboard.png"
            alt=""
            width={1024}
            height={1536}
            className="h-auto w-full drop-shadow-xl"
          />
          {/* Constrained to the cream face (center ~54%); font sizes track the board
              width and cap out so they stay readable but never overflow. */}
          <div className="absolute inset-x-[23%] top-[43%] flex -translate-y-1/2 flex-col items-center gap-[1.5cqw] text-ink">
            <div className="leading-none text-gold drop-shadow-sm text-[min(9cqw,18px)]">★★★★★</div>
            <div className="whitespace-nowrap font-extrabold leading-none tracking-wide text-[min(7.5cqw,12px)]">
              LAHORE, PK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
