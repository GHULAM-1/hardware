"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogOut, UserCog, Lock, LockOpen } from "lucide-react";

import { useAuth, useIsSuperAdmin } from "@/providers/auth-provider";
import { useLock } from "@/providers/lock-provider";
import { UserRole } from "@/lib/enums";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import { cn } from "@/lib/utils";
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
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();
  const { matchedLockedHref, isTabUnlocked, relockTab } = useLock();
  // The lock button reflects the CURRENT tab: green "Unlocked" (click to re-lock
  // this tab) when the current route is an unlocked locked-tab, gold "Lock"
  // (opens config) otherwise.
  const currentLockedHref = matchedLockedHref(pathname);
  const currentUnlocked = currentLockedHref !== null && isTabUnlocked(currentLockedHref);

  async function onLogout() {
    await signOut();
    router.replace("/login");
  }

  // Clicking the button re-locks the current tab when it's unlocked (it then
  // demands the password again); otherwise it opens the config dialog to set up
  // / manage the locked tabs.
  const showUnlocked = currentUnlocked;
  function onLockButton() {
    if (currentLockedHref !== null && currentUnlocked) {
      relockTab(currentLockedHref);
      toast.success(t("lock.relocked"));
    } else {
      openDialog(DialogKey.LockConfig, null);
    }
  }

  return (
    <header className="flex h-16 items-center gap-2 px-3 text-white sm:gap-3 sm:px-4">
      {/* Mobile: menu button + logo (sidebar is hidden). On the dashboard the
          sidebar is hidden on desktop too, so show the full logo there. */}
      <MobileNav />
      <Logo className="md:hidden" compact branded />
      {isDashboard && <Logo className="me-1 hidden md:flex" branded />}

      <div className="ms-1 flex min-w-0 flex-1 sm:ms-2 sm:max-w-md">
        <GlobalSearch />
      </div>

      {/* Tab lock — next to the search. Super_admin only. Reflects the current
          tab: green "Lock now" when this tab is unlocked (click to re-lock it);
          gold "Lock" otherwise (click to set up / manage locked tabs). */}
      {isSuperAdmin && (
        <button
          type="button"
          onClick={onLockButton}
          title={showUnlocked ? t("lock.relockHint") : t("lock.manageTitle")}
          aria-label={showUnlocked ? t("lock.relockHint") : t("lock.manageTitle")}
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-bold shadow-md outline-none transition-transform hover:brightness-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-white sm:px-3",
            showUnlocked ? "bg-emerald-500 text-white" : "bg-gold text-slate-900",
          )}
        >
          {showUnlocked ? (
            <LockOpen className="h-5 w-5" strokeWidth={2.75} />
          ) : (
            <Lock className="h-5 w-5" strokeWidth={2.75} />
          )}
          <span className="hidden text-sm sm:inline">
            {showUnlocked ? t("lock.relockHint") : t("lock.lock")}
          </span>
        </button>
      )}

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
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserCog className="me-2 h-4 w-4" />
              {t("nav.settings")}
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
