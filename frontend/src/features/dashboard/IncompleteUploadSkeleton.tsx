import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder for an incomplete upload row while loading.
 */
export function IncompleteUploadSkeleton() {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-dark p-3">
            <div className="flex items-center gap-3">
                <Skeleton className="size-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
    );
}
