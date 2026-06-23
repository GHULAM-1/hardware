"use client";

import Image from "next/image";

/**
 * Theme decor for the dashboard's empty side gutters on wide screens: the mascot
 * stands bottom-left, the hardware-shop signboard hangs top-right (with the live
 * rating + location on its blank face). Purely decorative — pointer-events off,
 * aria-hidden, sized via the gutter width so it never crosses into the content,
 * and gone below xl where there's no gutter to fill.
 */
export function DashboardDecor() {
  // Keep the prop within the gutter: half the viewport minus half the content
  // width (max-w-5xl = 1024px → 512) minus a margin. Clamps to 0 (hidden) when tight.
  const gutter = "min(260px, calc(50vw - 552px))";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden select-none xl:block">
      {/* Mascot — standing in the bottom-left gutter. */}
      <Image
        src="/mascot.png"
        alt=""
        width={1024}
        height={1536}
        className="dash-bob absolute bottom-0 left-2 drop-shadow-xl"
        style={{ width: gutter, height: "auto" }}
      />

      {/* Signboard — hanging in the top-right gutter, with live info on its face. */}
      <div className="absolute end-2 top-[180px]" style={{ width: gutter }}>
        <div className="dash-sway relative">
          <Image
            src="/signboard.png"
            alt=""
            width={1024}
            height={1536}
            className="h-auto w-full drop-shadow-xl"
          />
          {/* Overlay sits on the blank cream face (≈ vertical middle). Nudge top-% if needed. */}
          <div className="absolute inset-x-0 top-[44%] flex -translate-y-1/2 flex-col items-center gap-1 text-ink">
            <div className="text-lg leading-none text-gold drop-shadow-sm">★★★★★</div>
            <div className="text-[11px] font-extrabold tracking-wide">LAHORE, PK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
