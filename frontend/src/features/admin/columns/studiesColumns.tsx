import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { StudyListItem } from "@/features/admin/admin.types";

/** @description Maps a study status enum to a human-readable label. */
export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    FINISHED: "Finished",
  };
  return labels[status] ?? status;
}

/** @description Badge variant for each study status. */
const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> =
  {
    NOT_STARTED: "outline",
    IN_PROGRESS: "secondary",
    FINISHED: "default",
  };

/** @description Column definitions for the studies data table. */
export const studiesColumns: ColumnDef<StudyListItem>[] = [
  {
    accessorKey: "name",
    header: "Study Name",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant[row.original.status] ?? "outline"}>
        {formatStatus(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "sites",
    header: "Sites",
    cell: ({ row }) =>
      row.original.sites.map((s) => s.name).join(", ") || "—",
    meta: { className: "max-w-64 truncate" },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
    meta: { className: "tabular-nums" },
  },
];
