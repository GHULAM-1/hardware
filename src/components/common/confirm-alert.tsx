"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

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

/**
 * A self-contained confirmation, rendered in its own portal via local `open`
 * state. Unlike the shared {@link ConfirmDeleteDialog} (which goes through the
 * single-slot DialogManager and therefore REPLACES whatever dialog is open), this
 * stacks ON TOP of the surrounding dialog or form and leaves it mounted — so
 * cancelling returns the user to exactly where they were, with their input intact.
 * Use this for destructive actions that live INSIDE another dialog or a form
 * (e.g. removing an uploaded image, settling a khata from its detail view).
 */
export function ConfirmAlert({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Action-button label. Defaults to the (red) "Delete". */
  confirmLabel?: string;
  /** Red destructive button when true (the default); plain button when false. */
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={busy}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel ?? t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
