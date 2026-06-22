import Image from "next/image";

import { cn } from "@/lib/utils";

/** Bump if the PNGs in /public/icons-3d are re-rendered (busts the browser cache). */
const ICON3D_VERSION = 8;

/** The pre-rendered glossy 3D POS icons available in /public/icons-3d (44 total). */
export type Icon3DName =
  // 15 dashboard heroes
  | "home"
  | "cart-plus"
  | "boxes"
  | "users"
  | "receipt"
  | "reports"
  | "truck"
  | "wallet"
  | "smartphone"
  | "toolbox"
  | "scanner"
  | "bell"
  | "calculator"
  | "settings"
  | "power"
  // form fields
  | "box-plus"
  | "barcode"
  | "building"
  | "banknote"
  | "tag-unit"
  | "tag"
  | "box"
  | "alert-triangle"
  | "layers"
  // actions / toolbar
  | "pencil"
  | "save"
  | "printer"
  | "cart"
  | "x"
  | "plus"
  | "trash"
  | "refresh"
  | "download"
  | "clock"
  | "search"
  | "scan"
  | "clipboard-check"
  | "money-bag"
  | "star"
  // payment
  | "credit-card"
  | "bank"
  // product categories
  | "wrench"
  | "hammer"
  | "droplet"
  | "bolt";

/**
 * Renders one of the glossy 3D candy icons. Centralized so the icon set, version
 * and rendering are managed in one place — use it anywhere an icon fits (menu grid,
 * KPI cards, sidebar, page headers, empty states…).
 */
export function Icon3D({
  name,
  size = 40,
  className,
  alt = "",
}: {
  name: Icon3DName;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={`/icons-3d/${name}.png?v=${ICON3D_VERSION}`}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      // Pin to exact size: `max-w-none` defeats the global `img{max-width:100%}`
      // reset and `shrink-0` stops flex compression, so a narrow cell can never
      // scale the icon down.
      style={{ width: size, height: size }}
      className={cn("max-w-none shrink-0 select-none object-contain", className)}
    />
  );
}
