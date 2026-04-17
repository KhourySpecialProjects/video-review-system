import type { Video } from "@/lib/types";
import { Search } from "lucide-react";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import { MobileVideoCard } from "./MobileVideoCard";

type MobileVideoListProps = {
    videos: Video[];
};

/**
 * @description Card-based video list for mobile viewports.
 * Uses Empty component for the zero-results state.
 *
 * @param videos - Array of videos to display
 */
export function MobileVideoList({ videos }: MobileVideoListProps) {
    if (videos.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Search />
                    </EmptyMedia>
                    <EmptyTitle>No videos found</EmptyTitle>
                    <EmptyDescription>
                        Try adjusting your search or filter criteria
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {videos.map((video) => (
                <MobileVideoCard key={video.id} video={video} />
            ))}
        </div>
    );
}
