"use client";

import { useCallback } from "react";

import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { DialogKey } from "@/lib/dialog-keys";
import type { ConfirmDeletePayload } from "@/components/dialogs/confirm-delete";

/** Opens the shared confirm-delete dialog. Reused by every list page. */
export function useConfirmDelete() {
  const { openDialog } = useDialogManager();
  return useCallback(
    (payload: ConfirmDeletePayload) => openDialog(DialogKey.ConfirmDelete, payload),
    [openDialog],
  );
}
