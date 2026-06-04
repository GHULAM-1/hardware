"use client";

import { Pencil, Trash2 } from "lucide-react";

import { useIsSuperAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

/**
 * Edit/delete actions for a table row. Renders nothing for `admin` (read-only),
 * so list pages don't each re-implement the role gate. Delete can be disabled
 * (e.g. an item referenced by orders can't be removed) with a reason tooltip.
 */
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
  const isSuperAdmin = useIsSuperAdmin();
  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? deleteDisabledReason : undefined}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
