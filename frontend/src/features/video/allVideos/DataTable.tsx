import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import { DataTablePagination } from "./DataTablePagination";

type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
};

/**
 * @description Generic DataTable component built on TanStack Table and
 * Shadcn Table primitives. Features a sunken inset look, styled header,
 * hover states, pagination, and an Empty component for zero results.
 *
 * @param columns - TanStack column definitions
 * @param data - Array of row data
 */
export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Sunken table container */}
            <div className="rounded-2xl bg-bg-dark/40 py-4 px-2 shadow-inset">
              <div className="overflow-hidden rounded-xl bg-bg-dark">
                <Table>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="border-border hover:bg-bg-dark/30 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-4 py-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-0">
                                    <Empty>
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon">
                                                <Search />
                                            </EmptyMedia>
                                            <EmptyTitle>No videos found</EmptyTitle>
                                            <EmptyDescription>
                                                Try adjusting your search or filter criteria
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <DataTablePagination table={table} />
        </div>
    );
}
