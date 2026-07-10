import { motion } from "motion/react";
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
 * Uses Empty component for the zero-results state. Cards fade and
 * slide in with a staggered spring when the result list renders.
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
        <motion.div
            className="flex flex-col gap-2"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.04 } },
            }}
        >
            {videos.map((video) => (
                <motion.div
                    key={video.id}
                    variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: { type: "spring", stiffness: 300, damping: 28 },
                        },
                    }}
                >
                    <MobileVideoCard video={video} />
                </motion.div>
            ))}
        </motion.div>
    );
}
