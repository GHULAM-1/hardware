/**
 * Single source of truth for dialog identifiers used by the DialogManager.
 * Each module registers a component against one of these keys in the registry.
 */
export const DialogKey = {
  ItemForm: "item-form",
  SupplierForm: "supplier-form",
  CustomerForm: "customer-form",
  CustomerProfile: "customer-profile",
  StockEntryForm: "stock-entry-form",
  ItemCreate: "item-create",
  OrderForm: "order-form",
  OrderEdit: "order-edit",
  Receipt: "receipt",
  KhataForm: "khata-form",
  ReminderForm: "reminder-form",
  UserForm: "user-form",
  ConfirmDelete: "confirm-delete",
} as const;

export type DialogKey = (typeof DialogKey)[keyof typeof DialogKey];
