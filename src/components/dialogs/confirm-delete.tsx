"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmDeletePayload = {
  title?: string;
  description?: string;
  onConfirm: () => Promise<unknown> | void;
};

/** Generic confirmation dialog. Registered under DialogKey.ConfirmDelete. */
export function ConfirmDeleteDialog({ payload, onClose }: DialogComponentProps<ConfirmDeletePayload>) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await payload.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{payload.title ?? t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>{payload.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
