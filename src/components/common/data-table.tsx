"use client";

import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

/**
 * Lightweight generic table. Callers gate the action column by role (just omit
 * the actions column for `admin`). Handles loading + empty states once for all.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  emptyText,
  onRowClick,
  selectedRowId,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  /** When set, the matching row is highlighted (desktop master-detail selection). */
  selectedRowId?: string;
}) {
  const { t } = useTranslation();

  return (
    // min-w-0 lets the table shrink inside grid/flex parents (e.g. dialogs) without
    // forcing the parent wider; the table scrolls internally only if truly needed.
    // The Table itself paints the sunken well; this wrapper only clips the
    // header rail to the rounded corners and draws the outer rim.
    <div className="w-full min-w-0 overflow-hidden rounded-xl border-2 border-white/25 shadow-[0_6px_0_rgba(0,0,0,0.28),0_12px_22px_rgba(4,14,40,0.4)]">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`s-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyText ?? t("common.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={getRowId(row)}
                data-state={selectedRowId === getRowId(row) ? "selected" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                // Fixed height so rows stay even whether or not a cell has a button.
                className={cn("h-14", onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
