import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/format";
import type { SiteListItem } from "@/features/admin/admin.types";

/** @description Column definitions for the sites data table. */
export const sitesColumns: ColumnDef<SiteListItem>[] = [
  {
    accessorKey: "name",
    header: "Site Name",
  },
  {
    accessorKey: "userCount",
    header: "Users",
    meta: { className: "text-right tabular-nums" },
  },
  {
    accessorKey: "studyCount",
    header: "Studies",
    meta: { className: "text-right tabular-nums" },
  },
  {
    accessorKey: "coordinatorName",
    header: "Coordinator",
    cell: ({ row }) => row.original.coordinatorName ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
    meta: { className: "tabular-nums" },
  },
];
