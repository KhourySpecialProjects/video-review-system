import { useState, useCallback } from "react";
import type { OnChangeFn, PaginationState, ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "./AdminDataTable";
import { AdminTablePagination } from "./AdminTablePagination";

/**
 * @description Generic tab content component for the admin dashboard.
 * Handles pagination state derivation from URL params, data table
 * rendering, pagination controls, and detail sheet management.
 * Each admin tab wraps this with its own useSuspenseQuery call and
 * tab-specific columns/sheet.
 *
 * @param rows - The current page of data rows.
 * @param total - Total number of records across all pages.
 * @param columns - TanStack Table column definitions for TRow.
 * @param renderSheet - Render prop for the detail sheet, receives the
 *   selected row, open state, and open-change handler.
 * @param queryParams - URL search params built by the loader.
 * @param setSearchParams - Setter from useSearchParams for URL updates.
 */
export function TabContent<TRow extends { id: string }>({
  rows,
  total,
  columns,
  renderSheet,
  queryParams,
  setSearchParams,
  rowClickable = true,
  showEditAction = false,
}: {
  rows: TRow[];
  total: number;
  columns: ColumnDef<TRow, unknown>[];
  renderSheet: (
    row: TRow,
    open: boolean,
    onOpenChange: (open: boolean) => void,
  ) => React.ReactNode;
  queryParams: URLSearchParams;
  setSearchParams: (
    setter: (prev: URLSearchParams) => URLSearchParams,
  ) => void;
  rowClickable?: boolean;
  showEditAction?: boolean;
}) {
  const [selectedRow, setSelectedRow] = useState<TRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const limit = Number(queryParams.get("limit") ?? "20");
  const offset = Number(queryParams.get("offset") ?? "0");
  const pageIndex = Math.floor(offset / limit);
  const pageCount = Math.ceil(total / limit) || 1;
  const pagination: PaginationState = { pageIndex, pageSize: limit };

  /** @description Updates URL when TanStack Table requests a pagination change. */
  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      setSearchParams((prev) => {
        const curLimit = Number(prev.get("limit") ?? "20");
        const curOffset = Number(prev.get("offset") ?? "0");
        const current: PaginationState = {
          pageIndex: Math.floor(curOffset / curLimit),
          pageSize: curLimit,
        };
        const next =
          typeof updater === "function" ? updater(current) : updater;
        const params = new URLSearchParams(prev);
        params.set("limit", String(next.pageSize));
        params.set("offset", String(next.pageIndex * next.pageSize));
        return params;
      });
    },
    [setSearchParams],
  );

  /** @description Navigates to a specific page index. */
  const handlePageChange = useCallback(
    (page: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(
          "offset",
          String(page * Number(params.get("limit") ?? "20")),
        );
        return params;
      });
    },
    [setSearchParams],
  );

  /** @description Changes page size and resets to the first page. */
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("limit", String(size));
        params.set("offset", "0");
        return params;
      });
    },
    [setSearchParams],
  );

  /** @description Opens the detail sheet for the clicked row. */
  const handleRowClick = useCallback((row: TRow) => {
    setSelectedRow(row);
    setSheetOpen(true);
  }, []);

  return (
    <>
      <AdminDataTable
        columns={columns}
        data={rows}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={handleRowClick}
        rowClickable={rowClickable}
        onEditRow={showEditAction ? handleRowClick : undefined}
      />
      <AdminTablePagination
        pageIndex={pageIndex}
        pageSize={limit}
        pageCount={pageCount}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
      {selectedRow && renderSheet(selectedRow, sheetOpen, setSheetOpen)}
    </>
  );
}
