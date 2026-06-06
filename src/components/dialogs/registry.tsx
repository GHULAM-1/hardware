"use client";

import { DialogKey } from "@/lib/dialog-keys";
import type { DialogRegistry } from "./dialog-manager";
import { ConfirmDeleteDialog } from "./confirm-delete";
import { ItemFormDialog } from "@/components/forms/item-form-dialog";
import { ItemDetailDialog } from "@/components/dialogs/item-detail-dialog";
import { SupplierFormDialog } from "@/components/forms/supplier-form-dialog";
import { SupplierDetailDialog } from "@/components/dialogs/supplier-detail-dialog";
import { StockDetailDialog } from "@/components/dialogs/stock-detail-dialog";
import { ItemCreateDialog } from "@/components/dialogs/item-create-dialog";
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog";
import { CustomerProfileDialog } from "@/components/dialogs/customer-profile-dialog";
import { OrderFormDialog } from "@/components/dialogs/order-form-dialog";
import { ReceiptDialog } from "@/components/dialogs/receipt-dialog";
import { OrderEditDialog } from "@/components/dialogs/order-edit-dialog";
import { KhataFormDialog } from "@/components/forms/khata-form-dialog";
import { KhataDetailDialog } from "@/components/dialogs/khata-detail-dialog";
import { SupplierOrderFormDialog } from "@/components/dialogs/supplier-order-form-dialog";
import { SupplierOrderDetailDialog } from "@/components/dialogs/supplier-order-detail-dialog";
import { ReminderFormDialog } from "@/components/forms/reminder-form-dialog";
import { UserFormDialog } from "@/components/forms/user-form-dialog";
import { UserEditDialog } from "@/components/forms/user-edit-dialog";

/**
 * Central dialog registry — single source of truth mapping dialog keys to their
 * components. Each module adds its entry here as it's built. Keep this the only
 * place dialogs are wired, so the DialogManager stays decoupled.
 */
export const dialogRegistry: DialogRegistry = {
  [DialogKey.ConfirmDelete]: ConfirmDeleteDialog,
  [DialogKey.ItemForm]: ItemFormDialog,
  [DialogKey.ItemDetail]: ItemDetailDialog,
  [DialogKey.SupplierForm]: SupplierFormDialog,
  [DialogKey.SupplierDetail]: SupplierDetailDialog,
  [DialogKey.StockEntryForm]: StockDetailDialog,
  [DialogKey.ItemCreate]: ItemCreateDialog,
  [DialogKey.CustomerForm]: CustomerFormDialog,
  [DialogKey.CustomerProfile]: CustomerProfileDialog,
  [DialogKey.OrderForm]: OrderFormDialog,
  [DialogKey.Receipt]: ReceiptDialog,
  [DialogKey.OrderEdit]: OrderEditDialog,
  [DialogKey.KhataForm]: KhataFormDialog,
  [DialogKey.KhataDetail]: KhataDetailDialog,
  [DialogKey.SupplierOrderForm]: SupplierOrderFormDialog,
  [DialogKey.SupplierOrderDetail]: SupplierOrderDetailDialog,
  [DialogKey.ReminderForm]: ReminderFormDialog,
  [DialogKey.UserForm]: UserFormDialog,
  [DialogKey.UserEdit]: UserEditDialog,
};
