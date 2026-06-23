"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAlert } from "@/components/common/confirm-alert";
import { cn } from "@/lib/utils";

/**
 * Shared wrapper for create/edit dialogs. Rendered by the DialogManager (so it's
 * always open) and reports close via onClose. Handles the form submit + busy state
 * so every entity form stays tiny and consistent.
 */
export function FormDialog({
  title,
  description,
  onClose,
  onSubmit,
  submitting,
  submitLabel,
  fullScreen = false,
  widthClassName,
  disabled = false,
  dirty = false,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  submitLabel?: string;
  fullScreen?: boolean;
  /** Widen the (non-fullscreen) dialog, e.g. "sm:max-w-3xl". */
  widthClassName?: string;
  disabled?: boolean;
  /**
   * Force the discard-confirm on close. For RHF forms you can omit this — when the
   * dialog is wrapped in a <Form> provider, the form's own dirty state is detected
   * automatically. Pass this for non-RHF (local-state) dialogs.
   */
  dirty?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  // Auto-detect unsaved edits for RHF dialogs (FormDialog rendered inside <Form>);
  // local-state dialogs pass `dirty` explicitly. useFormContext is null outside a provider.
  const formCtx = useFormContext();
  const isDirty = dirty || Boolean(formCtx?.formState?.isDirty);

  // Guard every close path: if there are unsaved edits, confirm before discarding.
  const requestClose = React.useCallback(() => {
    if (isDirty && !submitting) setConfirmDiscard(true);
    else onClose();
  }, [isDirty, submitting, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        className={cn(
          fullScreen
            ? "flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none"
            : cn("max-h-[90dvh] overflow-y-auto overflow-x-hidden", widthClassName),
        )}
      >
        <form
          onSubmit={onSubmit}
          noValidate
          className={cn(fullScreen && "flex h-full flex-col overflow-hidden")}
        >
          <DialogHeader className={cn(fullScreen && "border-b border-border p-6")}>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <div className={cn(fullScreen ? "flex-1 overflow-y-auto p-6" : "py-4")}>{children}</div>

          <DialogFooter className={cn(fullScreen && "border-t border-border p-6")}>
            <Button type="button" variant="outline" onClick={requestClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || disabled}>
              {submitLabel ?? t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmAlert
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={t("common.discardTitle")}
        description={t("common.discardDescription")}
        confirmLabel={t("common.discard")}
        onConfirm={onClose}
      />
    </Dialog>
  );
}
