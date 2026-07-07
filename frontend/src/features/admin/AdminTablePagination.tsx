import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * @description Pagination controls for the admin data table. Shows the
 * current record range, a rows-per-page selector, the current page
 * indicator, and first/previous/next/last navigation buttons.
 *
 * @param pageIndex - Zero-based current page index.
 * @param pageSize - Current page size.
 * @param pageCount - Total number of pages.
 * @param total - Total number of records.
 * @param onPageChange - Handler for page index changes.
 * @param onPageSizeChange - Handler for page size changes.
 */
export function AdminTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </p>

      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="admin-rows-per-page"
            className="text-sm font-normal text-muted-foreground"
          >
            Rows per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger id="admin-rows-per-page" className="h-8 w-18 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to first page"
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to previous page"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to next page"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Go to last page"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
