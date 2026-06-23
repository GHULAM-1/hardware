"use client";

import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { CustomerCombobox } from "@/components/common/customer-combobox";
import { DatePicker } from "@/components/common/date-picker";
import { OrderLineRow } from "@/components/orders/order-line-row";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/common/voice-input-button";
import { PaymentType } from "@/lib/enums";
import { orderSchema } from "@/lib/schemas";
import { useCreateOrder } from "@/hooks/use-orders";
import { useCustomer } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";
import { newLine, orderTotal, type LineDraft } from "@/components/orders/order-form-types";

// Two payment modes in the UI: full cash, or "udhaar" (deferred). The exact
// backend payment_type (credit when nothing paid, partial otherwise) is derived
// from the amount-paid field at submit — see derivedPayment below.
type PayMode = "cash" | "udhaar";
const PAY_MODES: { mode: PayMode; labelKey: string }[] = [
  { mode: "cash", labelKey: "payment.cash" },
  { mode: "udhaar", labelKey: "payment.credit" },
];

/** Non-blocking warning shown when a blacklisted customer is selected. */
function BlacklistBanner({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { data: customer } = useCustomer(customerId);
  if (!customer?.is_blacklisted) return null;
  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{t("orders.customerBlacklisted")}</span>
    </div>
  );
}

export function OrderFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateOrder();

  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<LineDraft[]>([newLine()]);
  const [payMode, setPayMode] = React.useState<PayMode>("cash");
  const [amountPaid, setAmountPaid] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");

  const total = orderTotal(lines);
  // Cash → fully paid. Udhaar → nothing entered means credit (paid 0); a part
  // payment means partial; paying the full amount collapses back to cash.
  const enteredPaid = Number(amountPaid) || 0;
  const isUdhaar = payMode === "udhaar";
  const paymentType: PaymentType = !isUdhaar
    ? PaymentType.Cash
    : enteredPaid <= 0
      ? PaymentType.Credit
      : enteredPaid >= total
        ? PaymentType.Cash
        : PaymentType.Partial;
  const paid = paymentType === PaymentType.Cash ? total : paymentType === PaymentType.Credit ? 0 : enteredPaid;
  const remaining = Math.max(total - paid, 0);

  function updateLine(key: string, next: LineDraft) {
    setLines((ls) => ls.map((l) => (l.key === key ? next : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Friendly guards before zod (which would otherwise say "Invalid UUID").
    if (!customerId) {
      toast.error(t("orders.selectCustomer"));
      return;
    }
    if (!lines.some((l) => l.item && Number(l.quantity) > 0 && l.selling_price !== "")) {
      toast.error(t("orders.addAtLeastOneItem"));
      return;
    }
    // Udhaar that isn't fully paid needs a due date.
    if (paymentType !== PaymentType.Cash && !dueDate) {
      toast.error(t("orders.dueDateRequired"));
      return;
    }

    const payload = {
      customer_id: customerId ?? "",
      payment_type: paymentType,
      amount_paid: paymentType === PaymentType.Partial ? amountPaid : 0,
      due_date: paymentType === PaymentType.Cash ? null : dueDate || null,
      internal_note: internalNote,
      lines: lines
        .filter((l) => l.item && Number(l.quantity) > 0 && l.selling_price !== "")
        .map((l) => ({
          item_id: l.item!.id,
          quantity: l.quantity,
          unit: l.unit,
          selling_price: l.selling_price,
        })),
    };

    const parsed = orderSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.required"));
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      toast.success(t("toast.created"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.error"));
    }
  }

  return (
    <FormDialog
      title={t("orders.newOrder")}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={create.isPending}
      submitLabel={t("common.create")}
      dirty={Boolean(customerId) || lines.some((l) => l.item) || internalNote.trim() !== ""}
      widthClassName="w-[calc(100%-2rem)] sm:max-w-3xl"
    >
      <div className="space-y-5">
        {/* Customer */}
        <div className="space-y-2">
          <Label>{t("fields.customer")}</Label>
          <CustomerCombobox value={customerId} onChange={(v) => setCustomerId(v)} />
          {customerId && <BlacklistBanner customerId={customerId} />}
        </div>

        {/* Lines */}
        <div className="space-y-3">
          {lines.map((line, i) => (
            <OrderLineRow
              key={line.key}
              line={line}
              index={i}
              customerId={customerId}
              onChange={(next) => updateLine(line.key, next)}
              onRemove={() => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== line.key) : ls))}
            />
          ))}
          <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, newLine()])}>
            <Plus className="me-1 h-4 w-4" />
            {t("orders.addLine")}
          </Button>
        </div>

        {/* Internal note (staff-only; never printed on the customer receipt) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("orders.internalNote")}</Label>
            <VoiceInputButton
              onText={(text) => setInternalNote((cur) => (cur ? `${cur} ${text}` : text))}
            />
          </div>
          <Textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder={t("orders.internalNotePlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("orders.internalNoteHint")}</p>
        </div>

        {/* Payment */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <Label>{t("fields.paymentType")}</Label>
          <div className="inline-flex flex-wrap rounded-md border border-border p-0.5">
            {PAY_MODES.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setPayMode(opt.mode)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  payMode === opt.mode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {isUdhaar && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("fields.amountPaid")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">{t("orders.amountPaidHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.dueDate")}</Label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
            </div>
          )}

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orders.total")}</span>
              <Money value={total} className="font-semibold" />
            </div>
            {isUdhaar && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("fields.balanceDue")}</span>
                <Money value={remaining} className="font-semibold text-destructive" />
              </div>
            )}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
