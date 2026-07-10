import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import { VideoOff, SearchX } from "lucide-react";

/**
 * @description Empty state shown when the reviewer has no assigned videos at all.
 * Displayed when the total count is zero and no filters are applied.
 */
export function NoVideosEmpty() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <VideoOff />
                </EmptyMedia>
                <EmptyTitle>No videos assigned</EmptyTitle>
                <EmptyDescription>
                    You don't have any videos assigned for review yet.
                    Check back later or contact your study coordinator.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

/**
 * @description Empty state shown when filters are applied but no videos match.
 * Displayed when the total count is zero and at least one filter is active.
 */
export function NoFilterResultsEmpty() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <SearchX />
                </EmptyMedia>
                <EmptyTitle>No matching videos</EmptyTitle>
                <EmptyDescription>
                    No videos match your current filters.
                    Try adjusting or clearing your filters.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
