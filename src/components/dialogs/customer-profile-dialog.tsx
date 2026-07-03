"use client";

import { useTranslation } from "react-i18next";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { CustomerDetailBody } from "@/components/details/customer-detail-body";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/types/models";

export type CustomerProfilePayload = { customer: Customer };

export function CustomerProfileDialog({ payload, onClose }: DialogComponentProps<CustomerProfilePayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { customer } = payload;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden sm:max-w-4xl">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate pe-6">{displayName(customer, language)}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {customer.phone ? <span dir="ltr">{customer.phone}</span> : null}
            {customer.phone ? <span aria-hidden>·</span> : null}
            <span>
              {t("fields.addedOn")}: {formatDateTime(customer.created_at)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <CustomerDetailBody customer={customer} />
      </DialogContent>
    </Dialog>
  );
}
