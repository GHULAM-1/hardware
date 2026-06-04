"use client";

import { DialogKey } from "@/lib/dialog-keys";
import type { DialogRegistry } from "./dialog-manager";
import { ConfirmDeleteDialog } from "./confirm-delete";
import { ItemFormDialog } from "@/components/forms/item-form-dialog";
import { SupplierFormDialog } from "@/components/forms/supplier-form-dialog";
import { StockDetailDialog } from "@/components/dialogs/stock-detail-dialog";
import { ItemCreateDialog } from "@/components/dialogs/item-create-dialog";
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog";
import { CustomerProfileDialog } from "@/components/dialogs/customer-profile-dialog";
import { OrderFormDialog } from "@/components/dialogs/order-form-dialog";
import { ReceiptDialog } from "@/components/dialogs/receipt-dialog";
import { OrderEditDialog } from "@/components/dialogs/order-edit-dialog";
import { KhataFormDialog } from "@/components/forms/khata-form-dialog";
import { UserFormDialog } from "@/components/forms/user-form-dialog";

/**
 * Central dialog registry — single source of truth mapping dialog keys to their
 * components. Each module adds its entry here as it's built. Keep this the only
 * place dialogs are wired, so the DialogManager stays decoupled.
 */
export const dialogRegistry: DialogRegistry = {
  [DialogKey.ConfirmDelete]: ConfirmDeleteDialog,
  [DialogKey.ItemForm]: ItemFormDialog,
  [DialogKey.SupplierForm]: SupplierFormDialog,
  [DialogKey.StockEntryForm]: StockDetailDialog,
  [DialogKey.ItemCreate]: ItemCreateDialog,
  [DialogKey.CustomerForm]: CustomerFormDialog,
  [DialogKey.CustomerProfile]: CustomerProfileDialog,
  [DialogKey.OrderForm]: OrderFormDialog,
  [DialogKey.Receipt]: ReceiptDialog,
  [DialogKey.OrderEdit]: OrderEditDialog,
  [DialogKey.KhataForm]: KhataFormDialog,
  [DialogKey.UserForm]: UserFormDialog,
};
