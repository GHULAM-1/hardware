"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useKhatas, useFulfillKhata, useSettleAllKhata } from "@/hooks/use-khata";
import { ConfirmAlert } from "@/components/common/confirm-alert";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { KhataStatus } from "@/lib/enums";
import { khataMeta } from "@/lib/status-meta";
import { displayName } from "@/lib/display";
import { formatDate, formatDateTime, todayISO } from "@/lib/format";
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
import { cn } from "@/lib/utils";
import type { KhataListView } from "@/types/models";

export type CustomerKhataPayload = { customerId: string };

/** A pending confirm: either settling one entry or settling every pending entry. */
type Pending = { mode: "all" } | { mode: "one"; id: string } | null;

/**
 * The full udhaar record for one customer. Reads the live khata list and filters
 * to this customer, so it stays in sync after a settle. Pending entries are shown
 * first with their actions; fulfilled ones follow as greyed-out "paid off" history.
 * Settling (one entry or all) is gated behind a stacked {@link ConfirmAlert}.
 */
export function CustomerKhataDialog({ payload, onClose }: DialogComponentProps<CustomerKhataPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();
  const { data: khatas = [] } = useKhatas();
  const { fulfill, pendingId } = useFulfillKhata();
  const settleAll = useSettleAllKhata();
  const today = todayISO();

  const [confirm, setConfirm] = React.useState<Pending>(null);

  const entries = khatas.filter((k) => k.customer?.id === payload.customerId);
  const pending = entries.filter((k) => k.status === KhataStatus.Pending);
  const fulfilled = entries.filter((k) => k.status === KhataStatus.Fulfilled);
  const customer = entries[0]?.customer ?? null;
  const total = pending.reduce((sum, k) => sum + k.amount, 0);
  const busy = settleAll.isPending || Boolean(pendingId);

  async function onConfirm() {
    if (!confirm) return;
    if (confirm.mode === "all") {
      try {
        await settleAll.mutateAsync(pending.map((k) => k.id));
        toast.success(t("khata.settledAll"));
      } catch {
        toast.error(t("khata.markFailed"));
      }
    } else {
      fulfill(confirm.id);
    }
  }

  function renderEntry(k: KhataListView) {
    const paid = k.status === KhataStatus.Fulfilled;
    const meta = khataMeta(k.status as KhataStatus, k.due_date, today);
    return (
      <li
        key={k.id}
        className={cn(
          "rounded-lg border border-border p-3",
          paid && "bg-muted/40 opacity-70",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Money value={k.amount} className="font-semibold" />
              <StatusBadge tone={meta.tone} label={t(meta.labelKey)} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("fields.dueDate")}: {formatDate(k.due_date)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("fields.addedOn")}: {formatDateTime(k.created_at)}
            </p>
            {k.description ? <p className="mt-1 text-sm">{k.description}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
            {isSuperAdmin && !paid ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setConfirm({ mode: "one", id: k.id })}
              >
                {pendingId === k.id ? (
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="me-1 h-4 w-4" />
                )}
                {t("khata.markFulfilled")}
              </Button>
            ) : null}
            {k.order_id ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDialog(DialogKey.Receipt, { orderId: k.order_id })}
              >
                <Receipt className="me-1 h-4 w-4" />
                {t("khata.viewReceipt")}
              </Button>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? displayName(customer, language) : t("khata.detail")}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{t("khata.entriesCount", { count: pending.length })}</span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-foreground">
              {t("khata.totalOutstanding")}: <Money value={total} />
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {pending.length > 0 ? (
            <ul className="space-y-2">{pending.map(renderEntry)}</ul>
          ) : (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
              {t("khata.allCleared")}
            </p>
          )}

          {fulfilled.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t("khata.paidOff")}</h3>
              <ul className="space-y-2">{fulfilled.map(renderEntry)}</ul>
            </div>
          ) : null}
        </div>

        {isSuperAdmin && pending.length > 0 ? (
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => setConfirm({ mode: "all" })}>
              {settleAll.isPending ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-1 h-4 w-4" />
              )}
              {t("khata.settleAll")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>

      <ConfirmAlert
        open={confirm !== null}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={confirm?.mode === "all" ? t("khata.settleAllTitle") : t("khata.markFulfilledTitle")}
        description={
          confirm?.mode === "all"
            ? t("khata.settleAllConfirm", { count: pending.length })
            : t("khata.markFulfilledConfirm")
        }
        confirmLabel={confirm?.mode === "all" ? t("khata.settleAll") : t("khata.markFulfilled")}
        destructive={false}
        onConfirm={onConfirm}
      />
    </Dialog>
  );
}
