"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, UserCog } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/enums";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/layout/logo";
import { GlobalSearch } from "@/components/search/global-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  // The dashboard hides the sidebar (it's a launcher), so surface the full logo
  // in the topbar there on desktop too.
  const isDashboard = pathname === "/dashboard";
  const { profile, signOut } = useAuth();

  async function onLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center gap-2 px-3 text-white sm:gap-3 sm:px-4">
      {/* Mobile: menu button + logo (sidebar is hidden). On the dashboard the
          sidebar is hidden on desktop too, so show the full logo there. */}
      <MobileNav />
      <Logo className="md:hidden" compact />
      {isDashboard && <Logo className="me-1 hidden md:flex" />}

      <div className="flex min-w-0 flex-1 sm:max-w-md">
        <GlobalSearch />
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <Avatar className="h-10 w-10 shrink-0 border-2 border-gold">
              {profile?.image_url && <AvatarImage src={profile.image_url} alt={profile.full_name ?? ""} />}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 max-w-[8rem] text-start lg:block">
              <p className="truncate text-sm font-bold leading-tight text-white">{profile?.full_name ?? "—"}</p>
              <p className="truncate text-xs font-semibold text-gold">
                {t(`roles.${profile?.role ?? UserRole.Admin}`)}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{profile?.full_name ?? "—"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserCog className="me-2 h-4 w-4" />
              {t("profile.title")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="me-2 h-4 w-4" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
