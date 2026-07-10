import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { IncompleteUpload } from "@shared-types/video";
import { UploadCard } from "./UploadCard";

const SWIPE_THRESHOLD = 50;
// Visual depth constants. CARD_OFFSET is the y-distance between adjacent
// cards in the stack; CARD_SCALE_STEP controls how much smaller each
// card is relative to the active one. Both "before" and "after" cards
// use the same magnitudes so the stack reads symmetrically.
const CARD_OFFSET = 14;
const CARD_SCALE_STEP = 0.06;
// How many cards are visible on either side of the active card.
const VISIBLE_NEIGHBOURS = 2;

type UploadCardStackProps = {
    uploads: IncompleteUpload[];
    busy: boolean;
    onResume: (videoId: string) => void;
    onCancel: (videoId: string) => void;
};

/**
 * @description A swipeable stacked card UI for incomplete uploads on mobile.
 * The active card sits centred with two cards peeking symmetrically from
 * each side. Swiping up advances, swiping down goes back, and the stack
 * wraps infinitely — swiping past the last card loops to the first.
 *
 * @param uploads - List of incomplete uploads to display
 * @param busy - Whether a fetcher action is in flight
 * @param onResume - Called with videoId when user taps Resume
 * @param onCancel - Called with videoId when user confirms cancel
 */
export function UploadCardStack({ uploads, busy, onResume, onCancel }: UploadCardStackProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    // direction: -1 = moved forward (goNext), 1 = moved back (goPrev).
    // Used so exits animate off the correct edge.
    const [direction, setDirection] = useState(0);

    if (uploads.length === 0) return null;

    const count = uploads.length;

    /**
     * @description Wraps an index into `[0, count)`. Used so `activeIndex`
     * loops past either end of the list.
     *
     * @param i - Raw index to normalise
     * @returns The equivalent index modulo the stack length
     */
    function wrap(i: number) {
        return ((i % count) + count) % count;
    }

    /**
     * @description Signed, shortest-path offset from `activeIndex` to a
     * card's index, in the range `[-⌊count/2⌋, ⌈count/2⌉]`. That way the
     * stack treats the list as circular — a card one step "past" the end
     * is offset +1, not `count-1`.
     *
     * @param i - Index of the card
     * @returns The circular offset relative to the current active card
     */
    function circularOffset(i: number) {
        const raw = i - activeIndex;
        if (raw > count / 2) return raw - count;
        if (raw < -count / 2) return raw + count;
        return raw;
    }

    /**
     * @description Advances to the next card, wrapping around when past
     * the end of the list.
     */
    function goNext() {
        setDirection(-1);
        setActiveIndex((i) => wrap(i + 1));
    }

    /**
     * @description Goes back to the previous card, wrapping around when
     * before the start of the list.
     */
    function goPrev() {
        setDirection(1);
        setActiveIndex((i) => wrap(i - 1));
    }

    return (
        <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                {activeIndex + 1} of {count} incomplete
            </p>

            {/* Stack container. Vertical padding reserves room for the
                peeking neighbours on both sides so layout doesn't jitter
                as cards enter and exit. */}
            <div className="relative w-full min-h-56 py-8">
                <AnimatePresence initial={false}>
                    {uploads.map((upload, i) => {
                        const offset = circularOffset(i);
                        if (Math.abs(offset) > VISIBLE_NEIGHBOURS) return null;

                        const isActive = offset === 0;
                        const depth = Math.abs(offset);

                        // Active card enters from whichever side matches
                        // the swipe direction; neighbours enter from
                        // beyond the visible window so they seem to slide
                        // in from one more row deep in the stack.
                        const initialY = isActive
                            ? direction < 0
                                ? 140
                                : -140
                            : Math.sign(offset) * (VISIBLE_NEIGHBOURS + 1) * CARD_OFFSET;
                        const initialScale = isActive
                            ? 0.92
                            : 1 - (depth + 1) * CARD_SCALE_STEP;
                        const exitY = direction < 0 ? -200 : 200;

                        return (
                            <motion.div
                                key={upload.videoId}
                                className="absolute inset-x-0"
                                style={{
                                    // Active on top, then by depth symmetrically.
                                    zIndex: 20 - depth,
                                    touchAction: "none",
                                }}
                                initial={{ y: initialY, opacity: 0, scale: initialScale }}
                                animate={{
                                    y: offset * CARD_OFFSET,
                                    scale: 1 - depth * CARD_SCALE_STEP,
                                    opacity: 1,
                                }}
                                exit={{ y: exitY, opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                                drag={isActive ? "y" : false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.18}
                                dragMomentum={false}
                                whileDrag={{
                                    scale: 1.02,
                                    boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
                                }}
                                onDragEnd={(_e, info) => {
                                    if (info.offset.y < -SWIPE_THRESHOLD) goNext();
                                    else if (info.offset.y > SWIPE_THRESHOLD) goPrev();
                                }}
                            >
                                <UploadCard
                                    upload={upload}
                                    busy={busy}
                                    onResume={() => onResume(upload.videoId)}
                                    onCancel={() => onCancel(upload.videoId)}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Dot indicators */}
            {count > 1 && (
                <div className="flex gap-1.5">
                    {uploads.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setDirection(i > activeIndex ? -1 : 1);
                                setActiveIndex(i);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === activeIndex
                                    ? "w-4 bg-warning"
                                    : "w-1.5 bg-text-muted/30"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
