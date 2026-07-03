"use client";

import { useTranslation } from "react-i18next";
import { Icon3D } from "@/components/ui/icon-3d";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { SupplierOrderStatus } from "@/lib/enums";
import { displayName } from "@/lib/display";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  useSupplierItems,
  useSupplierOrdersBySupplier,
} from "@/hooks/use-supplier-orders";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Supplier } from "@/types/models";

export type SupplierDetailPayload = { supplier: Supplier };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export function SupplierDetailDialog({ payload, onClose }: DialogComponentProps<SupplierDetailPayload>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const { openDialog } = useDialogManager();
  const { supplier } = payload;

  const { data: items = [], isLoading: itemsLoading } = useSupplierItems(supplier.id);
  const { data: orders = [], isLoading: ordersLoading } = useSupplierOrdersBySupplier(supplier.id);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="break-words pe-6">{supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card px-4 py-1">
          <Field label={t("suppliers.supplierName")}>{supplier.name}</Field>
          <Field label={t("fields.shopName")}>{supplier.shop_name ?? "—"}</Field>
          <Field label={t("fields.phone")}>
            {supplier.phone ? <span dir="ltr">{supplier.phone}</span> : "—"}
          </Field>
          <Field label={t("suppliers.location")}>{supplier.address ?? "—"}</Field>
          <Field label={t("fields.addedOn")}>{formatDateTime(supplier.created_at)}</Field>
        </div>

        {/* Items we buy from this supplier — ordered history, or a stock-in fallback. */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("suppliers.itemsBought")}</h3>
          {itemsLoading ? (
            <div className="flex flex-wrap gap-2">
              {[64, 88, 72, 56].map((w, i) => (
                <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium"
                >
                  {displayName(item, language)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("suppliers.noItems")}</p>
          )}
        </section>

        {/* Recent orders placed with this supplier. */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("suppliers.recentOrders")}</h3>
          {ordersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          ) : orders.length > 0 ? (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => openDialog(DialogKey.SupplierOrderDetail, { id: o.id })}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-start transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{o.order_no}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(o.created_at)} · {t("supplierOrders.items")}: {o.item_count}
                      </span>
                    </span>
                    <StatusBadge
                      tone={
                        o.status === SupplierOrderStatus.Received
                          ? "success"
                          : o.status === SupplierOrderStatus.Partial
                            ? "info"
                            : "warning"
                      }
                      label={t(`supplierOrders.${o.status}`)}
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("suppliers.noOrders")}</p>
          )}
        </section>

        {isSuperAdmin && (
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openDialog(DialogKey.SupplierForm, { supplier })}
            >
              <Icon3D name="pencil" size={24} className="-ms-1 me-1" alt="" />
              {t("suppliers.editSupplier")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
