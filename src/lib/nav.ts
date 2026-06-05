import {
  LayoutDashboard,
  Tag,
  Warehouse,
  Users,
  ShoppingCart,
  BookUser,
  Truck,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

/** Single source of truth for the app's navigation. `i18nKey` resolves the label. */
export type NavItem = {
  href: string;
  i18nKey: string;
  icon: LucideIcon;
  /**
   * Whether the read-only `admin` role may see/visit this entry. Super_admin sees
   * everything; admin is limited to stock & catalog (no revenue/customer data).
   */
  adminAllowed?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", i18nKey: "nav.dashboard", icon: LayoutDashboard, adminAllowed: true },
  { href: "/pricing", i18nKey: "nav.pricing", icon: Tag, adminAllowed: true },
  { href: "/warehouse", i18nKey: "nav.warehouse", icon: Warehouse, adminAllowed: true },
  { href: "/customers", i18nKey: "nav.customers", icon: Users },
  { href: "/orders", i18nKey: "nav.orders", icon: ShoppingCart },
  { href: "/khata", i18nKey: "nav.khata", icon: BookUser },
  { href: "/suppliers", i18nKey: "nav.suppliers", icon: Truck },
  { href: "/users", i18nKey: "nav.users", icon: UserCog },
  { href: "/settings", i18nKey: "nav.settings", icon: Settings },
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
