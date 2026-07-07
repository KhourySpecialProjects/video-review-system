import { useCallback } from "react";
import { motion } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MotionTableRow = motion.create(TableRow);

/** @description Optional per-column UI hints read from columnDef.meta. */
type ColumnUiMeta = { className?: string };

/**
 * @description Extracts the optional className hint from a column's meta.
 * Columns can set `meta: { className: "text-right" }` to align or style
 * both their header and body cells.
 *
 * @param meta - The columnDef.meta value.
 * @returns The className string, or undefined.
 */
function metaClassName(meta: unknown): string | undefined {
  return (meta as ColumnUiMeta | undefined)?.className;
}

/**
 * @description Renders skeleton placeholder rows while data is loading.
 *
 * @param cols - Number of columns to render.
 * @param rows - Number of skeleton rows to show.
 */
function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * @description Generic admin data table built on TanStack Table with
 * server-side pagination and motion-animated row entrance. Clicking
 * a row (or pressing Enter/Space with the row focused) calls onRowClick
 * with the row's original data.
 *
 * @param columns - TanStack Table column definitions.
 * @param data - The current page of data.
 * @param pageCount - Total number of pages (from the API).
 * @param pagination - Current pagination state (pageIndex, pageSize).
 * @param onPaginationChange - Handler for pagination state changes.
 * @param onRowClick - Handler called when a row is clicked.
 * @param isLoading - Whether data is currently loading.
 */
export function AdminDataTable<TData>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  onRowClick,
  isLoading = false,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  onRowClick: (row: TData) => void;
  isLoading?: boolean;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange,
  });

  /** @description Keyboard handler for accessible row activation. */
  const handleKeyDown = useCallback(
    (row: TData) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick(row);
      }
    },
    [onRowClick],
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-muted/50 hover:bg-muted/50"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-10 px-4 text-xs font-medium text-muted-foreground",
                    metaClassName(header.column.columnDef.meta),
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows cols={columns.length} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row, index) => (
              <MotionTableRow
                key={row.id}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                onClick={() => onRowClick(row.original)}
                onKeyDown={handleKeyDown(row.original)}
                tabIndex={0}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4 py-3",
                      metaClassName(cell.column.columnDef.meta),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </MotionTableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
