"use client";

import { useTranslation } from "react-i18next";
import { Check, ImageIcon, Loader2, Receipt } from "lucide-react";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useFulfillKhata } from "@/hooks/use-khata";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { KhataStatus } from "@/lib/enums";
import { khataMeta } from "@/lib/status-meta";
import { displayName } from "@/lib/display";
import { formatDate, todayISO } from "@/lib/format";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KhataListView } from "@/types/models";

export type KhataDetailPayload = { khata: KhataListView };

/** A labelled row in the details list. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function KhataDetailDialog({ payload, onClose }: DialogComponentProps<KhataDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();
  const { fulfill, isPending } = useFulfillKhata();

  const { khata } = payload;
  const meta = khataMeta(khata.status as KhataStatus, khata.due_date, todayISO());
  const isPendingKhata = khata.status === KhataStatus.Pending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("khata.detail")}</DialogTitle>
          <DialogDescription>
            {khata.customer ? displayName(khata.customer, language) : t("khata.reminderNote")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("fields.customer")}>
            {khata.customer ? displayName(khata.customer, language) : "—"}
          </Field>
          {khata.customer?.phone ? (
            <Field label={t("fields.phone")}>
              <span dir="ltr">{khata.customer.phone}</span>
            </Field>
          ) : null}
          <Field label={t("fields.amount")}>
            <Money value={khata.amount} />
          </Field>
          <Field label={t("fields.dueDate")}>{formatDate(khata.due_date)}</Field>
          <Field label={t("fields.status")}>
            <StatusBadge tone={meta.tone} label={t(meta.labelKey)} />
          </Field>
          {khata.description ? (
            <Field label={t("fields.note")}>{khata.description}</Field>
          ) : null}
          <Field label={t("khata.createdOn")}>{formatDate(khata.created_at)}</Field>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {khata.proof_url ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={khata.proof_url} target="_blank" rel="noopener noreferrer">
                <ImageIcon className="me-1 h-4 w-4" />
                {t("khata.viewProof")}
              </a>
            </Button>
          ) : null}
          {khata.order_id ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openDialog(DialogKey.Receipt, { orderId: khata.order_id })}
            >
              <Receipt className="me-1 h-4 w-4" />
              {t("khata.viewReceipt")}
            </Button>
          ) : null}
          {isSuperAdmin && isPendingKhata ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => fulfill(khata.id, onClose)}
            >
              {isPending ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-1 h-4 w-4" />
              )}
              {t("khata.markFulfilled")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
