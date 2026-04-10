import { Form, useLoaderData, useNavigation } from "react-router";
import type { SearchLoaderData } from "@/lib/video.service";
import { formatDuration, formatDate, formatTime } from "@/lib/format";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CalendarDays,
    Clock3,
    Search,
    Filter,
    X,
    CirclePlay,
    Loader2,
} from "lucide-react";
import { Link, useSubmit } from "react-router";
import { useState } from "react";

let debounceTimer: ReturnType<typeof setTimeout>;

/**
 * @description All-videos panel with server-side search and date filtering.
 * Uses a GET `<Form>` to serialize search inputs into URL params, which
 * triggers the route loader to re-run and return filtered results via
 * `useLoaderData()`.
 */
export function AllVideos() {
    const { search, q } = useLoaderData() as SearchLoaderData;
    const navigation = useNavigation();
    const submit = useSubmit();
    const isSearching = navigation.state === "loading";

    const { videos, total } = search;
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <Form method="get" className="flex flex-col gap-4">
                {/* Search & Filter bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                        <Input
                            name="q"
                            placeholder="Search by title or description..."
                            defaultValue={q}
                            onChange={(e) => {
                                const form = e.currentTarget.form;
                                clearTimeout(debounceTimer);
                                debounceTimer = setTimeout(() => submit(form), 300);
                            }}
                            className="pl-10 bg-bg-dark border-border text-text placeholder:text-text-muted"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            size="sm"
                            className="gap-2"
                        >
                            <Search className="size-4" />
                            Search
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2 border-border text-text"
                        >
                            <Filter className="size-4" />
                            Filters
                        </Button>
                    </div>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-bg-light p-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-text">Upload Date</p>
                            <div className="flex flex-wrap gap-2">
                                <DateInput name="uploadedAfter" label="From" />
                                <DateInput name="uploadedBefore" label="To" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-text">Filmed Date</p>
                            <div className="flex flex-wrap gap-2">
                                <DateInput name="filmedAfter" label="From" />
                                <DateInput name="filmedBefore" label="To" />
                            </div>
                        </div>
                    </div>
                )}
            </Form>

            {/* Results count */}
            <div className="flex items-center gap-2 text-sm text-text-muted">
                {isSearching && <Loader2 className="size-4 animate-spin" />}
                <span>
                    {total} video{total !== 1 ? "s" : ""} found
                </span>
            </div>

            {/* Accordion list */}
            {videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-light py-12 text-center">
                    <Search className="mb-3 size-10 text-text-muted" />
                    <p className="text-lg font-medium text-text">No videos found</p>
                    <p className="text-sm text-text-muted">
                        Try adjusting your search or filter criteria
                    </p>
                </div>
            ) : (
                <Accordion className="space-y-2">
                    {videos.map((video) => (
                        <AccordionItem
                            key={video.id}
                            className="rounded-xl border border-border bg-bg-light px-4 data-open:shadow-m"
                        >
                            <AccordionTrigger className="py-4 hover:no-underline">
                                <div className="flex flex-1 items-center gap-3 text-left">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black">
                                        <CirclePlay className="size-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-text">
                                            {video.title}
                                        </p>
                                        <p className="truncate text-xs text-text-muted">
                                            {formatDuration(video.durationSeconds)} • {formatDate(video.createdAt)}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 text-xs font-semibold ${video.status === "UPLOADED" ? "text-success" : video.status === "FAILED" ? "text-destructive" : "text-warning"}`}>
                                        {video.status === "UPLOADED" ? "Uploaded" : video.status === "FAILED" ? "Failed" : "Uploading"}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col gap-3 pb-2">
                                    <p className="text-sm text-text-muted">
                                        {video.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                                        <span className="flex items-center gap-1.5">
                                            <CalendarDays className="size-3.5" />
                                            Uploaded: {formatDate(video.createdAt)}
                                        </span>
                                        {video.takenAt && (
                                            <>
                                                <span className="flex items-center gap-1.5">
                                                    <CalendarDays className="size-3.5" />
                                                    Filmed: {formatDate(video.takenAt)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock3 className="size-3.5" />
                                                    {formatTime(video.takenAt)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        Uploaded by: <span className="font-medium text-text">{video.uploadedBy}</span>
                                    </div>
                                    <Link
                                        to={`/videos/${video.id}`}
                                        className="mt-1 inline-flex w-fit items-center gap-2 rounded-md border border-border px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all"
                                    >
                                        <CirclePlay className="size-4" />
                                        Watch Video
                                    </Link>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}

/* ─── Date Input Helper ──────────────────────────────────────────────────── */

type DateInputProps = {
    name: string;
    label: string;
};

/**
 * @description A date picker button that stores its value in a hidden input
 * so it gets serialized by the parent `<Form>`.
 *
 * @param name - The form input name (e.g. "uploadedAfter")
 * @param label - Placeholder text when no date is selected
 */
function DateInput({ name, label }: DateInputProps) {
    const [date, setDate] = useState<Date | undefined>();

    return (
        <>
            <input type="hidden" name={date ? name : ""} value={date?.toISOString() ?? ""} />
            <Popover>
                <PopoverTrigger
                    className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all"
                >
                    <CalendarDays className="size-3.5" />
                    {date
                        ? date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })
                        : label}
                    {date && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDate(undefined);
                            }}
                            className="ml-1 text-text-muted hover:text-text"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-bg-light border-border" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                    />
                </PopoverContent>
            </Popover>
        </>
    );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

/**
 * @description Loading skeleton placeholder for the AllVideos panel.
 */
export function AllVideosSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-border bg-bg-light p-4"
                    >
                        <Skeleton className="size-10 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-3 w-2/5" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}
