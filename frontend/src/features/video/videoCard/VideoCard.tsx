import { useRef, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import type { Video } from "@/lib/types";
import type { MainOutletContext } from "@/routes/root";
import { formatDuration, formatDate, formatTime } from "@/lib/format";
import { getThumbnail } from "@/lib/thumbnailCache";
import { CalendarDays, Clock3, CirclePlay } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @description Card component for a video in the grid. Displays a thumbnail,
 * title, description, and date info. The thumbnail wrapper shares a motion
 * `layoutId` with the video player page so it morphs into the player on
 * navigate. Every card keeps a uniform `aspect-video` box so the grid never
 * has one card taller than the others.
 *
 * On mobile the card "jumps out" based on its position in the viewport:
 * cards physically below the currently-centred card scale slightly larger,
 * cards above scale slightly smaller, and the card at dead-centre lifts
 * and picks up a deeper shadow. Desktop viewports skip the animation —
 * the motion `style` is only attached when `useIsMobile` is true, which
 * means motion's transforms are simply absent on desktop instead of
 * fighting a CSS override.
 */
export function VideoCard({ video }: { video: Video }) {
    const [isPortrait, setIsPortrait] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const { mainRef } = useOutletContext<MainOutletContext>();
    const isMobile = useIsMobile();

    // Track where the card sits inside the app's real scroll container.
    // offset: 0 → card just entered from the bottom; 1 → card just left
    // from the top. 0.5 is dead-centre.
    const { scrollYProgress } = useScroll({
        target: cardRef,
        container: mainRef,
        offset: ["start end", "end start"],
    });

    // All three values peak when the card is dead-centre in the viewport
    // (progress 0.5) and fall off symmetrically as it scrolls away in
    // either direction. That way the focus card — the one actually in
    // the middle of the user's view — is always the biggest, regardless
    // of scroll position. Range kept narrow so neighbours don't collide.
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1.04, 0.96]);
    const lift = useTransform(scrollYProgress, [0, 0.5, 1], [0, -10, 0]);
    const boxShadow = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        [
            "0 1px 2px rgba(0,0,0,0.10)",
            "0 18px 40px rgba(0,0,0,0.35)",
            "0 1px 2px rgba(0,0,0,0.10)",
        ],
    );

    return (
        <motion.div
            ref={cardRef}
            style={isMobile ? { scale, y: lift, boxShadow } : undefined}
            className="relative rounded-xl"
        >
            <Link
                to={`/videos/${video.id}`}
                state={{ isPortrait }}
                className="block"
            >
                <Card className="group overflow-hidden border-border bg-bg-light p-0 gap-2">
                    {/* Thumbnail */}
                    <motion.div
                        layoutId={`video-${video.id}`}
                        transition={{ type: "spring", stiffness: 260, damping: 32 }}
                        className="relative flex items-center justify-center w-full overflow-hidden bg-black aspect-video"
                    >
                        {isPortrait && (
                            <img
                                src={getThumbnail(video.id) ?? video.imgUrl}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 size-full object-cover blur-xl scale-110"
                            />
                        )}
                        <img
                            src={getThumbnail(video.id) ?? video.imgUrl}
                            alt={video.title}
                            className={isPortrait ? "h-full w-3/4 object-cover relative mx-auto" : "size-full object-cover"}
                            loading="lazy"
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                setIsPortrait(img.naturalHeight > img.naturalWidth);
                            }}
                            onError={(e) => {
                                const cached = getThumbnail(video.id);
                                if (cached && e.currentTarget.src !== cached) {
                                    e.currentTarget.src = cached;
                                }
                            }}
                        />

                        <div className="absolute">
                            <CirclePlay className="size-12 text-primary opacity-80 transition-transform group-hover:scale-110 md:size-16" />
                        </div>
                        {/* Duration badge */}
                        <div className="absolute bottom-2 right-2 rounded-md bg-bg-dark/80 px-1.5 py-0.5">
                            <span className="text-xs font-medium text-text">
                                {formatDuration(video.durationSeconds)}
                            </span>
                        </div>
                    </motion.div>

                    {/* Info */}
                    <div className="flex flex-col gap-1.5 px-3 py-2.5 md:gap-2 md:px-4 md:py-3">
                        <h3 className="truncate text-sm font-semibold text-text md:text-base">
                            {video.title}
                        </h3>
                        <p className="line-clamp-2 min-h-[2lh] text-xs text-text-muted">
                            {video.description}
                        </p>

                        {/* Date & Time row */}
                        <div className="flex items-center gap-3 text-[11px] text-text-muted md:gap-4 md:text-xs">
                            {video.takenAt ? (
                                <>
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="size-3 md:size-3.5" />
                                        {formatDate(video.takenAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock3 className="size-3 md:size-3.5" />
                                        {formatTime(video.takenAt)}
                                    </span>
                                </>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="size-3 md:size-3.5" />
                                    {formatDate(video.createdAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}

export function VideoCardSkeleton() {
    return (
        <div className="border-border bg-bg-dark">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-1.5 px-3 py-2.5 md:gap-2 md:px-4 md:py-3">
                <Skeleton className="h-4 w-3/5 md:h-5" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-14" />
                </div>
            </div>
        </div>
    );
}
