import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { UserListItem } from "@/features/admin/admin.types";

/** @description Maps a backend role enum to a human-readable label. */
export function formatRole(role: string): string {
  const labels: Record<string, string> = {
    CAREGIVER: "Caregiver",
    CLINICAL_REVIEWER: "Clinical Reviewer",
    SITE_COORDINATOR: "Site Coordinator",
    SYSADMIN: "System Admin",
  };
  return labels[role] ?? role;
}

/** @description Badge variant for each user role. */
const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  SYSADMIN: "default",
  SITE_COORDINATOR: "secondary",
  CLINICAL_REVIEWER: "outline",
  CAREGIVER: "outline",
};

/** @description Column definitions for the users data table. */
export const usersColumns: ColumnDef<UserListItem>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { className: "max-w-72 truncate" },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant={roleBadgeVariant[row.original.role] ?? "outline"}>
        {formatRole(row.original.role)}
      </Badge>
    ),
  },
  {
    accessorKey: "isDeactivated",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isDeactivated ? "destructive" : "default"}>
        {row.original.isDeactivated ? "Deactivated" : "Active"}
      </Badge>
    ),
  },
];
