import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatTime } from "@/lib/format";
import type { AuditLogListItem } from "../admin.types";

type DiffRow = {
  key: string;
  oldValue: string | undefined;
  newValue: string | undefined;
  status: "added" | "removed" | "changed" | "unchanged";
};

/**
 * @description Computes a visual diff between old and new snapshot objects.
 * The diff is purely presentational — the backend stores raw snapshots
 * and the frontend computes what changed for display.
 *
 * @param oldValues - The snapshot before the change.
 * @param newValues - The snapshot after the change.
 * @returns Array of diff rows with status indicators.
 */
function computeDiff(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): DiffRow[] {
  const allKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);
  const rows: DiffRow[] = [];

  for (const key of allKeys) {
    const oldVal =
      key in oldValues ? JSON.stringify(oldValues[key]) : undefined;
    const newVal =
      key in newValues ? JSON.stringify(newValues[key]) : undefined;

    let status: DiffRow["status"];
    if (oldVal === undefined) status = "added";
    else if (newVal === undefined) status = "removed";
    else if (oldVal !== newVal) status = "changed";
    else status = "unchanged";

    rows.push({ key, oldValue: oldVal, newValue: newVal, status });
  }

  return rows;
}

/** @description Color classes for each diff status. */
const statusColors: Record<DiffRow["status"], string> = {
  added: "bg-green-500/10 text-green-700 dark:text-green-400",
  removed: "bg-red-500/10 text-red-700 dark:text-red-400",
  changed: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  unchanged: "",
};

/** @description Label for each diff status. */
const statusLabels: Record<DiffRow["status"], string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  unchanged: "Unchanged",
};

/**
 * @description Read-only side sheet for viewing an audit log entry.
 * Shows metadata and a color-coded diff table comparing old/new values.
 *
 * @param auditLog - The audit log entry to display.
 * @param open - Whether the sheet is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function AuditSheet({
  auditLog,
  open,
  onOpenChange,
}: {
  auditLog: AuditLogListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  /** @description Computed diff between old and new snapshots. */
  const diffRows = useMemo(
    () => computeDiff(auditLog.oldValues, auditLog.newValues),
    [auditLog.oldValues, auditLog.newValues],
  );

  const hasChanges = diffRows.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Audit Log Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-2">
            <Badge>{auditLog.actionType}</Badge>
            <Badge variant="outline">{auditLog.entityType}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Actor</Label>
              <p>{auditLog.actorName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Site</Label>
              <p>{auditLog.siteName ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Entity ID</Label>
              <p className="truncate font-mono text-xs">
                {auditLog.entityId}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">IP Address</Label>
              <p className="font-mono text-xs">
                {auditLog.ipAddress ?? "—"}
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Timestamp</Label>
              <p>
                {formatDate(auditLog.createdAt)}{" "}
                {formatTime(auditLog.createdAt)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-muted-foreground">Changes</Label>
            {!hasChanges ? (
              <p className="text-sm text-muted-foreground">
                No values recorded.
              </p>
            ) : (
              <div className="rounded-md border text-sm">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-px bg-muted">
                  <div className="bg-background px-3 py-1.5 font-medium">
                    Field
                  </div>
                  <div className="bg-background px-3 py-1.5 font-medium">
                    Before
                  </div>
                  <div className="bg-background px-3 py-1.5 font-medium">
                    After
                  </div>
                  <div className="bg-background px-3 py-1.5 font-medium">
                    Status
                  </div>
                </div>
                {diffRows.map((row) => (
                  <div
                    key={row.key}
                    className={`grid grid-cols-[1fr_1fr_1fr_auto] gap-px ${statusColors[row.status]}`}
                  >
                    <div className="px-3 py-1.5 font-mono text-xs font-medium">
                      {row.key}
                    </div>
                    <div className="px-3 py-1.5 font-mono text-xs break-all">
                      {row.oldValue ?? "—"}
                    </div>
                    <div className="px-3 py-1.5 font-mono text-xs break-all">
                      {row.newValue ?? "—"}
                    </div>
                    <div className="px-3 py-1.5 text-xs">
                      {statusLabels[row.status]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
