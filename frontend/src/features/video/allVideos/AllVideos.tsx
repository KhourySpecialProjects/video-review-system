import { useState, useMemo } from "react";
import type { Video } from "@/lib/types";
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
} from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";

interface AllVideosProps {
    videos: Video[];
}

export function AllVideos({ videos }: AllVideosProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [uploadDateFrom, setUploadDateFrom] = useState<Date | undefined>();
    const [uploadDateTo, setUploadDateTo] = useState<Date | undefined>();
    const [filmedDateFrom, setFilmedDateFrom] = useState<Date | undefined>();
    const [filmedDateTo, setFilmedDateTo] = useState<Date | undefined>();
    const [showFilters, setShowFilters] = useState(false);

    const filteredVideos = useMemo(() => {
        let result = videos;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (v) =>
                    v.title.toLowerCase().includes(query) ||
                    v.description.toLowerCase().includes(query)
            );
        }

        if (uploadDateFrom) {
            result = result.filter(
                (v) => new Date(v.uploadedAt) >= uploadDateFrom
            );
        }
        if (uploadDateTo) {
            const endOfDay = new Date(uploadDateTo);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(
                (v) => new Date(v.uploadedAt) <= endOfDay
            );
        }

        if (filmedDateFrom) {
            result = result.filter(
                (v) => new Date(v.filmedAt) >= filmedDateFrom
            );
        }
        if (filmedDateTo) {
            const endOfDay = new Date(filmedDateTo);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(
                (v) => new Date(v.filmedAt) <= endOfDay
            );
        }

        return result;
    }, [videos, searchQuery, uploadDateFrom, uploadDateTo, filmedDateFrom, filmedDateTo]);

    const hasActiveFilters =
        uploadDateFrom || uploadDateTo || filmedDateFrom || filmedDateTo;

    const clearFilters = () => {
        setUploadDateFrom(undefined);
        setUploadDateTo(undefined);
        setFilmedDateFrom(undefined);
        setFilmedDateTo(undefined);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Search & Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                    <Input
                        placeholder="Search by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-bg-dark border-border text-text placeholder:text-text-muted"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-2 border-border text-text"
                    >
                        <Filter className="size-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                !
                            </span>
                        )}
                    </Button>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-1 text-text-muted"
                        >
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-bg-light p-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-text">Upload Date</p>
                        <div className="flex flex-wrap gap-2">
                            <DatePickerButton
                                label="From"
                                date={uploadDateFrom}
                                onSelect={setUploadDateFrom}
                            />
                            <DatePickerButton
                                label="To"
                                date={uploadDateTo}
                                onSelect={setUploadDateTo}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-text">Filmed Date</p>
                        <div className="flex flex-wrap gap-2">
                            <DatePickerButton
                                label="From"
                                date={filmedDateFrom}
                                onSelect={setFilmedDateFrom}
                            />
                            <DatePickerButton
                                label="To"
                                date={filmedDateTo}
                                onSelect={setFilmedDateTo}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Results count */}
            <p className="text-sm text-text-muted">
                {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""} found
            </p>

            {/* Accordion list */}
            {filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-light py-12 text-center">
                    <Search className="mb-3 size-10 text-text-muted" />
                    <p className="text-lg font-medium text-text">No videos found</p>
                    <p className="text-sm text-text-muted">
                        Try adjusting your search or filter criteria
                    </p>
                </div>
            ) : (
                <Accordion className="space-y-2">
                    {filteredVideos.map((video, index) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                        >
                            <AccordionItem
                                value={video.id}
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
                                                {formatDuration(video.duration)} • {formatDate(video.uploadedAt)}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold text-success">
                                            {video.status === "received" ? "Received" : "Pending"}
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
                                                Uploaded: {formatDate(video.uploadedAt)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays className="size-3.5" />
                                                Filmed: {formatDate(video.filmedAt)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock3 className="size-3.5" />
                                                {formatTime(video.filmedAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-text-muted">
                                            Filmed by: <span className="font-medium text-text">{video.filmedBy}</span>
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
                        </motion.div>
                    ))}
                </Accordion>
            )}
        </div>
    );
}

/* ─── Date Picker Helper ──────────────────────────────────────────────────── */

interface DatePickerButtonProps {
    label: string;
    date: Date | undefined;
    onSelect: (date: Date | undefined) => void;
}

function DatePickerButton({ label, date, onSelect }: DatePickerButtonProps) {
    return (
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
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-bg-light border-border" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

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
