"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";

import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDeleteItem, useUsedItemIds } from "@/hooks/use-items";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { stockMeta } from "@/lib/status-meta";
import { formatQuantity, thresholdBase } from "@/lib/units";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemDetailBody } from "@/components/warehouse/item-detail-body";
import type { ItemWithStock } from "@/types/models";

export default function WarehousePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const deleteItem = useDeleteItem();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: allItems = [], isLoading } = useItemsWithStock(debounced);
  const { data: usedItemIds } = useUsedItemIds();

  // The warehouse only manages items opted-in via the Items screen. Untracked
  // items keep their stock entries (and last quantity) but live in Items only.
  const items = React.useMemo(
    () => allItems.filter((i) => i.track_in_warehouse),
    [allItems],
  );

  // Desktop shows a master-detail side panel; the first row is selected by default.
  // Mobile keeps the tap-to-open detail dialog.
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  const handleRowClick = React.useCallback(
    (row: ItemWithStock) => {
      if (typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches) {
        setSelectedId(row.id);
      } else {
        openDialog(DialogKey.ItemDetail, { item: row });
      }
    },
    [openDialog],
  );

  const columns: Column<ItemWithStock>[] = [
    {
      key: "row_no",
      header: "#",
      headerClassName: "w-12",
      cell: (_row, i) => <span className="text-sm text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "name",
      header: t("fields.name"),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={row.image_urls?.[0] ?? row.image_url} alt={row.name_en} />
          <span className="font-medium text-primary underline-offset-2 hover:underline">
            {displayName(row, language)}
          </span>
        </div>
      ),
    },
    {
      key: "unit",
      header: t("fields.unit"),
      cell: (row) => t(`units.${row.primary_unit}`),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "qty",
      header: t("warehouse.currentStock"),
      cell: (row) => (
        <span dir="ltr" className="font-semibold tabular-nums">
          {formatQuantity(row, row.quantity, (k) => t(`units.${k}`))}
        </span>
      ),
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (row) => {
        const m = stockMeta(row.quantity, thresholdBase(row));
        return <StatusBadge tone={m.tone} label={t(m.labelKey)} />;
      },
    },
    {
      key: "price",
      header: t("fields.sellingPrice"),
      cell: (row) => <Money value={row.selling_price} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "added",
      header: t("fields.addedOn"),
      cell: (row) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(row.created_at)}</span>,
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-px",
      cell: (row) => (
        <div
          className="flex shrink-0 items-center justify-end gap-1 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => openDialog(DialogKey.StockEntryForm, { item: row })}
          >
            <Boxes className="me-1 h-4 w-4" />
            {t("warehouse.manageStock")}
          </Button>
          <RowActions
            onEdit={() => openDialog(DialogKey.ItemForm, { item: row })}
            deleteDisabled={usedItemIds?.has(row.id)}
            deleteDisabledReason={t("pricing.itemInUse")}
            onDelete={() =>
              confirmDelete({
                title: t("common.delete"),
                description: displayName(row, language),
                onConfirm: () => deleteItem.mutateAsync(row.id),
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("warehouse.title")} subtitle={t("warehouse.subtitle")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("pricing.searchItems")}
      />
      {!isLoading && items.length === 0 && !debounced && (
        <Card className="mb-4 p-6 text-center text-sm text-muted-foreground">
          {t("warehouse.emptyTracked")}
        </Card>
      )}
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            rows={items}
            getRowId={(r) => r.id}
            loading={isLoading}
            selectedRowId={selected?.id}
            onRowClick={handleRowClick}
          />
        </div>
        {/* Desktop master-detail panel; mobile uses the tap-to-open dialog instead. */}
        <aside className="hidden w-[360px] shrink-0 xl:block">
          {selected ? (
            <Card className="sticky top-0 gap-4 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <ImageThumb src={selected.image_urls?.[0] ?? selected.image_url} alt={selected.name_en} />
                <span className="min-w-0 truncate text-lg font-extrabold text-ink">
                  {displayName(selected, language)}
                </span>
              </div>
              <ItemDetailBody item={selected} />
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
