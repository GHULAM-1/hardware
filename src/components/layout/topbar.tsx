"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, UserCog } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/enums";
import { ModeToggle } from "@/components/mode-toggle";
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
  const { profile, signOut } = useAuth();

  async function onLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
      {/* Mobile: menu button + logo (sidebar is hidden) */}
      <MobileNav />
      <Logo className="md:hidden" compact />

      <div className="flex-1 sm:max-w-md">
        <GlobalSearch />
      </div>

      <div className="ms-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
              {profile?.image_url && <AvatarImage src={profile.image_url} alt={profile.full_name ?? ""} />}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-start sm:block">
              <p className="text-sm font-medium leading-tight">{profile?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
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
