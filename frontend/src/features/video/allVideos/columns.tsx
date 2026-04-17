import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import type { Video } from "@/lib/types";
import { formatDuration, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CirclePlay, Pencil, Clock3, CalendarDays } from "lucide-react";

/**
 * @description Column definitions for the AllVideos DataTable.
 * Columns: Title, Duration, Date, Status, Actions (Watch + Edit).
 */
export const columns: ColumnDef<Video>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
            <span className="truncate block font-semibold text-text">
                {row.getValue("title")}
            </span>
        ),
    },
    {
        accessorKey: "durationSeconds",
        header: () => (
            <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                Duration
            </span>
        ),
        cell: ({ row }) => (
            <span className="rounded-md bg-bg-dark px-2 py-0.5 text-xs font-mono text-text-muted">
                {formatDuration(row.getValue("durationSeconds"))}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: () => (
            <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Date
            </span>
        ),
        cell: ({ row }) => (
            <span className="text-text-muted">
                {formatDate(row.getValue("createdAt"))}
            </span>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as Video["status"];
            const variant =
                status === "UPLOADED" ? "secondary" :
                status === "FAILED" ? "destructive" : "outline";
            const label =
                status === "UPLOADED" ? "Uploaded" :
                status === "FAILED" ? "Failed" : "Uploading";
            return <Badge variant={variant}>{label}</Badge>;
        },
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1">
                <Link
                    to={`/videos/${row.original.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/80 transition-colors"
                >
                    <CirclePlay className="size-3.5" />
                    Watch
                </Link>
                <Link
                    to={`/videos/${row.original.id}?edit=true`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-muted transition-colors"
                >
                    <Pencil className="size-3" />
                    Edit
                </Link>
            </div>
        ),
    },
];
