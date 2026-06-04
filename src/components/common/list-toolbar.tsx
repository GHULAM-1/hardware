"use client";

import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";

import { useIsSuperAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Search box + role-gated primary action. Reused across list pages. */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  onNew,
  newLabel,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  onNew?: () => void;
  newLabel?: string;
}) {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
          className="ps-9"
        />
      </div>
      {isSuperAdmin && onNew && (
        <Button onClick={onNew} className="ms-auto">
          <Plus className="me-1 h-4 w-4" />
          {newLabel ?? t("common.add")}
        </Button>
      )}
    </div>
  );
}
