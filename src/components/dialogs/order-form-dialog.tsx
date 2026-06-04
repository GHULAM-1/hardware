"use client";

import * as React from "react";
import { Plus } from "lucide-react";
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
import { PaymentType } from "@/lib/enums";
import { orderSchema } from "@/lib/schemas";
import { paymentMeta } from "@/lib/status-meta";
import { useCreateOrder } from "@/hooks/use-orders";
import { useLastPurchase } from "@/hooks/use-customers";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { newLine, orderTotal, type LineDraft } from "@/components/orders/order-form-types";

const PAYMENT_OPTIONS = [PaymentType.Cash, PaymentType.Partial, PaymentType.Credit];

function CustomerHint({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { data: last } = useLastPurchase(customerId);
  if (!last) return null;
  return (
    <p className="rounded-md bg-secondary px-3 py-2 text-sm">
      {t("customers.lastPurchase", { item: last.item.name_en, price: formatPKR(last.price) })}
    </p>
  );
}

export function OrderFormDialog({ onClose }: DialogComponentProps<null>) {
  const { t } = useTranslation();
  const create = useCreateOrder();

  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<LineDraft[]>([newLine()]);
  const [paymentType, setPaymentType] = React.useState<PaymentType>(PaymentType.Cash);
  const [amountPaid, setAmountPaid] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  const total = orderTotal(lines);
  const paid = paymentType === PaymentType.Cash ? total : paymentType === PaymentType.Credit ? 0 : Number(amountPaid) || 0;
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

    const payload = {
      customer_id: customerId ?? "",
      payment_type: paymentType,
      amount_paid: paymentType === PaymentType.Partial ? amountPaid : 0,
      due_date: paymentType === PaymentType.Cash ? null : dueDate || null,
      lines: lines
        .filter((l) => l.item && Number(l.quantity) > 0 && l.selling_price !== "")
        .map((l) => ({
          item_id: l.item!.id,
          quantity: l.quantity,
          unit: l.unit,
          selling_price: l.selling_price,
          suppliers: l.suppliers
            .filter((s) => s.supplier_id && Number(s.quantity) > 0)
            .map((s) => ({
              supplier_id: s.supplier_id,
              quantity: s.quantity,
              buying_price: s.buying_price === "" ? null : s.buying_price,
            })),
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
      widthClassName="w-[calc(100%-2rem)] sm:max-w-3xl"
    >
      <div className="space-y-5">
        {/* Customer */}
        <div className="space-y-2">
          <Label>{t("fields.customer")}</Label>
          <CustomerCombobox value={customerId} onChange={(v) => setCustomerId(v)} />
          {customerId && <CustomerHint customerId={customerId} />}
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

        {/* Payment */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <Label>{t("fields.paymentType")}</Label>
          <div className="inline-flex flex-wrap rounded-md border border-border p-0.5">
            {PAYMENT_OPTIONS.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => setPaymentType(pt)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  paymentType === pt ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t(paymentMeta(pt).labelKey)}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {paymentType === PaymentType.Partial && (
              <div className="space-y-1.5">
                <Label>{t("fields.amountPaid")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            )}
            {paymentType !== PaymentType.Cash && (
              <div className="space-y-1.5">
                <Label>{t("fields.dueDate")}</Label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
            )}
          </div>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orders.total")}</span>
              <Money value={total} className="font-semibold" />
            </div>
            {paymentType !== PaymentType.Cash && (
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
