import { Suspense } from "react";
import { Await, Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import type { SearchLoaderData, VideoListResponse } from "@/lib/video.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { CalendarDays, Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { MobileVideoList } from "./MobileVideoList";

let debounceTimer: ReturnType<typeof setTimeout>;

/**
 * @description All-videos panel with server-side search, date filtering,
 * and a DataTable for display. Uses a GET `<Form>` to serialize search
 * inputs into URL params, triggering the route loader to re-run.
 * The search promise is deferred so tab switches are instant.
 */
export function AllVideos() {
    const { searchPromise, q } = useLoaderData() as SearchLoaderData;
    const navigation = useNavigation();
    const submit = useSubmit();
    const isSearching = navigation.state === "loading";
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <Form method="get" className="flex flex-col gap-4">
                {/* Search bar */}
                <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-light p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)]">
                    <Search className="ml-2 size-4 shrink-0 text-text-muted" />
                    <Input
                        name="q"
                        placeholder="Search by title or description..."
                        defaultValue={q}
                        onChange={(e) => {
                            const form = e.currentTarget.form;
                            clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(() => submit(form), 300);
                        }}
                        className="border-0 bg-transparent shadow-none text-text placeholder:text-text-muted focus-visible:ring-0"
                    />
                    <Button type="submit" size="sm" className="shrink-0">
                        Search
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="shrink-0 gap-1.5 text-text-muted"
                    >
                        <Filter className="size-4" />
                        Filters
                    </Button>
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

            {/* Deferred results */}
            <Suspense fallback={<AllVideosResultsSkeleton />}>
                <Await resolve={searchPromise}>
                    {({ videos, total }: VideoListResponse) => (
                        <>
                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                {isSearching && <Spinner />}
                                <span>
                                    {total} video{total !== 1 ? "s" : ""} found
                                </span>
                            </div>
                            {/* Desktop: DataTable, Mobile: card list */}
                            <div className="hidden md:block">
                                <DataTable columns={columns} data={videos} />
                            </div>
                            <div className="md:hidden">
                                <MobileVideoList videos={videos} />
                            </div>
                        </>
                    )}
                </Await>
            </Suspense>
        </div>
    );
}

/**
 * @description Inline skeleton shown while the deferred search promise resolves.
 */
function AllVideosResultsSkeleton() {
    return (
        <>
            <Skeleton className="h-4 w-24" />
            <div className="overflow-hidden rounded-xl border border-border">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 border-b border-border p-3"
                    >
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="hidden h-4 w-12 md:block" />
                        <Skeleton className="hidden h-4 w-20 md:block" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </>
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
            <div className="overflow-hidden rounded-xl border border-border">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 border-b border-border p-3"
                    >
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
