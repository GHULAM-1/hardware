"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, Search } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { UserRole } from "@/lib/enums";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/layout/logo";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.searchPlaceholder")} className="ps-9" />
      </div>

      <div className="ms-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
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
