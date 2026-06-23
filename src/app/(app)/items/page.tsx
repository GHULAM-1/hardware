"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";

import { useItemsWithStock } from "@/hooks/use-warehouse";
import { useDeleteItem, useSetWarehouseTracking, useUsedItemIds } from "@/hooks/use-items";
import { useDebounce } from "@/hooks/use-debounce";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useLanguage } from "@/providers/i18n-provider";
import { useIsSuperAdmin } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { displayName } from "@/lib/display";
import { formatQuantity } from "@/lib/units";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/common/list-toolbar";
import { DataTable, type Column } from "@/components/common/data-table";
import { RowActions } from "@/components/common/row-actions";
import { ImageThumb } from "@/components/common/image-thumb";
import { StatusBadge } from "@/components/common/status-badge";
import { Money } from "@/components/common/money";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ItemDetailBody } from "@/components/warehouse/item-detail-body";
import type { ItemWithStock } from "@/types/models";

export default function ItemsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const isSuperAdmin = useIsSuperAdmin();
  const deleteItem = useDeleteItem();
  const setTracking = useSetWarehouseTracking();

  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search);
  const { data: items = [], isLoading } = useItemsWithStock(debounced);
  const { data: usedItemIds } = useUsedItemIds();

  // Desktop shows a master-detail side panel (first row selected by default);
  // mobile keeps the tap-to-open detail dialog. Mirrors the Warehouse screen.
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
      // Row click opens the edit dialog for super-admins (see onRowClick below) —
      // no wrapping <button> here, since ImageThumb already renders its own button.
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={row.image_urls?.[0] ?? row.image_url} alt={row.name_en} />
          <span
            className={
              isSuperAdmin
                ? "font-medium text-primary underline-offset-2 hover:underline"
                : "font-medium"
            }
          >
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
      className: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      key: "price",
      header: t("fields.sellingPrice"),
      cell: (row) => <Money value={row.selling_price} />,
      className: "text-end",
      headerClassName: "text-end",
    },
    {
      key: "warehouse",
      header: t("items.trackInWarehouse"),
      headerClassName: "text-center",
      cell: (row) =>
        isSuperAdmin ? (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.track_in_warehouse}
              disabled={setTracking.isPending && setTracking.variables?.id === row.id}
              onCheckedChange={(track) => setTracking.mutate({ id: row.id, track })}
              aria-label={t("items.trackInWarehouse")}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <StatusBadge
              tone={row.track_in_warehouse ? "success" : "muted"}
              label={t(row.track_in_warehouse ? "items.tracked" : "items.notTracked")}
            />
          </div>
        ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "actions",
            header: "",
            headerClassName: "w-px",
            cell: (row: ItemWithStock) => (
              <div
                className="flex shrink-0 items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
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
          } as Column<ItemWithStock>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title={t("items.title")} subtitle={t("items.subtitle")} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("pricing.searchItems")}
        onNew={isSuperAdmin ? () => openDialog(DialogKey.ItemCreate, null) : undefined}
        newLabel={t("pricing.newItem")}
      />
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
