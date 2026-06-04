"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/providers/i18n-provider";

/** Hamburger → slide-over sidebar. Shown only on mobile (md:hidden). */
export function MobileNav() {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.dashboard")}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={dir === "rtl" ? "right" : "left"}
        className="w-64 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-5">
          <SheetTitle className="sr-only">{t("app.name")}</SheetTitle>
          <Logo />
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
