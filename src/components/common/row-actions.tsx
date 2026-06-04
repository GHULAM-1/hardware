"use client";

import { Pencil, Trash2 } from "lucide-react";

import { useIsSuperAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

/**
 * Edit/delete actions for a table row. Renders nothing for `admin` (read-only),
 * so list pages don't each re-implement the role gate.
 */
export function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
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
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
