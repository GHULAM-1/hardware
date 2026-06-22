"use client";

import { useTranslation } from "react-i18next";

import { useIsSuperAdmin } from "@/providers/auth-provider";
import { Icon3D } from "@/components/ui/icon-3d";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Edit/delete actions for a table row. Renders nothing for `admin` (read-only),
 * so list pages don't each re-implement the role gate. Delete can be disabled
 * (e.g. an item referenced by orders can't be removed) with a reason tooltip.
 *
 * Both actions use the glossy 3D icons (pencil = edit, trash = delete) at a
 * consistent size, with a bilingual tooltip and no hover-lift.
 */
const ACTION_BOX = "shrink-0 active:scale-95";
const ICON_SIZE = 34;

export function RowActions({
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}) {
  const { t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();
  if (!isSuperAdmin) return null;

  return (
    <div className="flex shrink-0 items-center justify-end">
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={t("common.edit")} onClick={onEdit} className={ACTION_BOX}>
              <Icon3D name="pencil" size={ICON_SIZE} alt="" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("common.edit")}</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper so the tooltip still shows when the button is disabled */}
            <span className="inline-flex">
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={onDelete}
                disabled={deleteDisabled}
                className={cn(ACTION_BOX, deleteDisabled && "pointer-events-none opacity-40 grayscale")}
              >
                <Icon3D name="trash" size={ICON_SIZE} alt="" />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {deleteDisabled && deleteDisabledReason ? deleteDisabledReason : t("common.delete")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
