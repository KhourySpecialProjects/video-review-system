import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import type { AuditLogListItem } from "@/features/admin/admin.types";

/** @description Badge variant for each audit action type. */
const actionBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  READ: "outline",
  DOWNLOAD: "outline",
  LOGIN: "outline",
};

/** @description Column definitions for the audit logs data table. */
export const auditColumns: ColumnDef<AuditLogListItem>[] = [
  {
    accessorKey: "actionType",
    header: "Action",
    cell: ({ row }) => (
      <Badge
        variant={actionBadgeVariant[row.original.actionType] ?? "outline"}
      >
        {row.original.actionType}
      </Badge>
    ),
  },
  {
    accessorKey: "entityType",
    header: "Entity",
  },
  {
    accessorKey: "actorName",
    header: "Actor",
  },
  {
    accessorKey: "siteName",
    header: "Site",
    cell: ({ row }) => row.original.siteName ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) =>
      `${formatDate(row.original.createdAt)} ${formatTime(row.original.createdAt)}`,
    meta: { className: "tabular-nums" },
  },
];
