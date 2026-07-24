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
  // The board reads as a single object rather than a column of art, so it can run
  // wider than the mascot without crowding the content.
  const board = "min(300px, calc(50vw - 540px))";

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

      {/* Signboard — hung from the top of the right gutter, carrying the shop name.
          Uses `signboard_trimmed.png`: the original 1024x1536 art placed the board
          in the middle of a mostly-empty canvas, so sizing the element by width
          rendered the board itself at barely half that — it looked shrunken with
          large invisible margins. The trimmed asset is cropped to the board, so its
          width IS the board's width.

          The overlay is positioned in percentages of the image and sized in cqw, so
          the name tracks the board at any gutter width and never spills off the
          cream face. */}
      {/* Hangs below the chrome: the topbar is h-16 (64px) and the stat bar ~105px,
          so anything higher than this sits on top of the avatar / language switcher. */}
      <div aria-hidden className="absolute end-2 top-[172px]" style={{ width: board }}>
        <div className="dash-sway relative" style={{ containerType: "inline-size" }}>
          <Image
            src="/signboard_trimmed.png"
            alt=""
            width={760}
            height={900}
            className="h-auto w-full drop-shadow-xl"
          />
          {/* The cream face spans x 16%–85%, y 35%–67% of the trimmed art. */}
          <div className="absolute inset-x-[18%] top-[50.5%] flex -translate-y-1/2 flex-col items-center gap-[0.8cqw] text-ink">
            <div className="leading-none text-brand-gold drop-shadow-sm text-[min(6cqw,13px)]">
              ★★★★★
            </div>
            <div className="flex flex-col items-center font-extrabold uppercase leading-[1.05] tracking-tight">
              <span className="whitespace-nowrap text-brand-red text-[min(11cqw,22px)]">Qasim</span>
              <span className="whitespace-nowrap text-brand-red text-[min(9cqw,18px)]">Hardware</span>
              <span className="whitespace-nowrap text-brand-gold text-[min(7.5cqw,15px)]">Store</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
