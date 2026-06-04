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
  /** Only super_admin sees this entry. */
  superAdminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", i18nKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/pricing", i18nKey: "nav.pricing", icon: Tag },
  { href: "/warehouse", i18nKey: "nav.warehouse", icon: Warehouse },
  { href: "/customers", i18nKey: "nav.customers", icon: Users },
  { href: "/orders", i18nKey: "nav.orders", icon: ShoppingCart },
  { href: "/khata", i18nKey: "nav.khata", icon: BookUser },
  { href: "/suppliers", i18nKey: "nav.suppliers", icon: Truck },
  { href: "/users", i18nKey: "nav.users", icon: UserCog, superAdminOnly: true },
  { href: "/settings", i18nKey: "nav.settings", icon: Settings },
];
