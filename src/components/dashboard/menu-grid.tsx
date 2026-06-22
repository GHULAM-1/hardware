"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * Game-style home tile menu (the image-#4 look) built from the 3D icon PNGs.
 * Each PNG already bakes in the glossy tile + object, so a tile is just the
 * image plus a label. Demo wiring — hrefs point at the nearest real route.
 */
type Tile = { icon: string; label: string; href: string };

const TILES: Tile[] = [
  { icon: "cart-plus", label: "New Sale", href: "/orders" },
  { icon: "boxes", label: "Stock Check", href: "/warehouse" },
  { icon: "users", label: "Customers", href: "/customers" },
  { icon: "receipt", label: "Payments", href: "/khata" },
  { icon: "reports", label: "Reports", href: "/supplier-orders" },
  { icon: "truck", label: "Suppliers", href: "/suppliers" },
  { icon: "wallet", label: "Expenses", href: "/khata" },
  { icon: "smartphone", label: "Mobile Items", href: "/warehouse" },
  { icon: "toolbox", label: "Hardware", href: "/warehouse" },
  { icon: "scanner", label: "Barcode Scan", href: "/warehouse" },
  { icon: "bell", label: "Notifications", href: "/dashboard" },
  { icon: "calculator", label: "Calculator", href: "/dashboard" },
  { icon: "settings", label: "Settings", href: "/settings" },
  { icon: "home", label: "Home", href: "/dashboard" },
];

export function MenuGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {TILES.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="group flex flex-col items-center gap-1 rounded-2xl p-1.5 transition-transform duration-150 hover:-translate-y-1 active:scale-95"
        >
          <Image
            src={`/icons-3d/${t.icon}.png?v=8`}
            alt={t.label}
            width={256}
            height={256}
            unoptimized
            /* PNG already carries a soft baked contact shadow — no extra CSS drop-shadow. */
            className="h-auto w-full max-w-[156px] transition-transform duration-150 group-hover:scale-[1.06]"
          />
          <span className="text-center text-sm font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">{t.label}</span>
        </Link>
      ))}
    </div>
  );
}
