import {
  LayoutDashboard,
  Tag,
  Warehouse,
  Users,
  ShoppingCart,
  BookUser,
  Truck,
  ClipboardList,
  UserCog,
  Contact,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { Icon3DName } from "@/components/ui/icon-3d";

/** The 8 "candy" color families (see globals.css). Each nav entry picks one — color = category. */
export type GameColor =
  | "green"
  | "blue"
  | "orange"
  | "purple"
  | "red"
  | "teal"
  | "pink"
  | "slate";

/** Single source of truth for the app's navigation. `i18nKey` resolves the label. */
export type NavItem = {
  href: string;
  i18nKey: string;
  /** Lucide fallback icon (used where the 3D set doesn't fit). */
  icon: LucideIcon;
  /** The glossy 3D icon shown in the sidebar. */
  icon3d: Icon3DName;
  /** Candy family for this entry's sidebar tile. */
  color: GameColor;
  /**
   * Whether the read-only `admin` role may see/visit this entry. Super_admin sees
   * everything; admin is limited to stock & catalog (no revenue/customer data).
   */
  adminAllowed?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", i18nKey: "nav.dashboard", icon: LayoutDashboard, icon3d: "home", color: "blue", adminAllowed: true },
  { href: "/items", i18nKey: "nav.items", icon: Tag, icon3d: "tag", color: "purple", adminAllowed: true },
  { href: "/warehouse", i18nKey: "nav.warehouse", icon: Warehouse, icon3d: "boxes", color: "orange", adminAllowed: true },
  { href: "/customers", i18nKey: "nav.customers", icon: Users, icon3d: "users", color: "purple" },
  { href: "/orders", i18nKey: "nav.orders", icon: ShoppingCart, icon3d: "cart-plus", color: "green" },
  { href: "/khata", i18nKey: "nav.khata", icon: BookUser, icon3d: "wallet", color: "teal" },
  { href: "/suppliers", i18nKey: "nav.suppliers", icon: Truck, icon3d: "truck", color: "blue" },
  { href: "/supplier-orders", i18nKey: "nav.supplierOrders", icon: ClipboardList, icon3d: "reports", color: "orange" },
  { href: "/staff", i18nKey: "nav.staff", icon: Contact, icon3d: "users", color: "pink" },
  { href: "/users", i18nKey: "nav.users", icon: UserCog, icon3d: "users", color: "teal" },
  { href: "/settings", i18nKey: "nav.settings", icon: Settings, icon3d: "settings", color: "slate" },
];

/**
 * Paths a read-only `admin` may visit directly — the admin-allowed nav entries
 * plus their own account page. Used by the route guard so an admin can't reach a
 * restricted page by typing its URL.
 */
const ADMIN_PATHS = [
  ...NAV_ITEMS.filter((i) => i.adminAllowed).map((i) => i.href),
  "/profile",
];

export function isAdminAllowedPath(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
