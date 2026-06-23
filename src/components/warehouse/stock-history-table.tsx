"use client";

import { useTranslation } from "react-i18next";

import { StockEntryType } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { formatQuantity } from "@/lib/units";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { RowActions } from "@/components/common/row-actions";
import type { ItemWithStock, StockEntryWithSupplier } from "@/types/models";

export function StockHistoryTable({
  item,
  entries,
  loading,
  onEdit,
  onDelete,
}: {
  item: ItemWithStock;
  entries: StockEntryWithSupplier[];
  loading: boolean;
  onEdit: (entry: StockEntryWithSupplier) => void;
  onDelete: (entry: StockEntryWithSupplier) => void;
}) {
  const { t } = useTranslation();

  const columns: Column<StockEntryWithSupplier>[] = [
    { key: "date", header: t("fields.date"), cell: (r) => formatDate(r.entry_date) },
    {
      key: "type",
      header: t("fields.status"),
      cell: (r) =>
        r.type === StockEntryType.In ? (
          <StatusBadge tone="success" label={t("warehouse.stockIn")} />
        ) : (
          <StatusBadge tone="danger" label={t("warehouse.stockOut")} />
        ),
    },
    { key: "supplier", header: t("fields.supplier"), cell: (r) => r.suppliers?.name ?? "—" },
    {
      key: "qty",
      header: t("fields.quantity"),
      cell: (r) => (
        <span dir="ltr" className="tabular-nums">
          {r.type === StockEntryType.In ? "+" : "−"}
          {formatQuantity(item, Number(r.quantity), (k) => t(`units.${k}`))}
        </span>
      ),
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "buying",
      header: t("fields.buyingPrice"),
      cell: (r) => (r.buying_price != null ? <Money value={r.buying_price} /> : "—"),
      className: "text-end",
      headerClassName: "text-end",
    },
    { key: "note", header: t("fields.note"), cell: (r) => r.note ?? "—" },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (r) => <RowActions onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />,
    },
  ];

  return (
    <DataTable columns={columns} rows={entries} getRowId={(r) => r.id} loading={loading} />
  );
}
