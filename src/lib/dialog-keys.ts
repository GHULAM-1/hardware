/**
 * Single source of truth for dialog identifiers used by the DialogManager.
 * Each module registers a component against one of these keys in the registry.
 */
export const DialogKey = {
  ItemForm: "item-form",
  ItemDetail: "item-detail",
  SupplierForm: "supplier-form",
  SupplierDetail: "supplier-detail",
  CustomerForm: "customer-form",
  CustomerProfile: "customer-profile",
  StockEntryForm: "stock-entry-form",
  ItemCreate: "item-create",
  OrderForm: "order-form",
  OrderEdit: "order-edit",
  OrderDetail: "order-detail",
  Receipt: "receipt",
  KhataForm: "khata-form",
  KhataDetail: "khata-detail",
  CustomerKhata: "customer-khata",
  SupplierOrderForm: "supplier-order-form",
  SupplierOrderDetail: "supplier-order-detail",
  SupplierOrderTally: "supplier-order-tally",
  StaffForm: "staff-form",
  StaffDetail: "staff-detail",
  SalaryAdvanceForm: "salary-advance-form",
  PaySalaryForm: "pay-salary-form",
  SalarySlip: "salary-slip",
  ReminderForm: "reminder-form",
  UserForm: "user-form",
  UserEdit: "user-edit",
  ConfirmDelete: "confirm-delete",
} as const;

export type DialogKey = (typeof DialogKey)[keyof typeof DialogKey];
