import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { IncompleteUpload } from "@shared-types/video";
import { UploadCard } from "./UploadCard";

const SWIPE_THRESHOLD = 50;
const CARD_OFFSET = 8;
const CARD_SCALE_STEP = 0.04;

type UploadCardStackProps = {
    uploads: IncompleteUpload[];
    busy: boolean;
    onResume: (videoId: string) => void;
    onCancel: (videoId: string) => void;
};

/**
 * @description A swipeable stacked card UI for incomplete uploads on mobile.
 * Cards are layered with a depth effect. Swipe up to go to next card,
 * swipe down for previous. Uses motion drag for fluid iOS-like feel.
 *
 * @param uploads - List of incomplete uploads to display
 * @param busy - Whether a fetcher action is in flight
 * @param onResume - Called with videoId when user taps Resume
 * @param onCancel - Called with videoId when user confirms cancel
 */
export function UploadCardStack({ uploads, busy, onResume, onCancel }: UploadCardStackProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    if (uploads.length === 0) return null;

    /**
     * @description Advances to the next card in the stack.
     */
    function goNext() {
        if (activeIndex >= uploads.length - 1) return;
        setDirection(-1);
        setActiveIndex((i) => i + 1);
    }

    /**
     * @description Goes back to the previous card in the stack.
     */
    function goPrev() {
        if (activeIndex <= 0) return;
        setDirection(1);
        setActiveIndex((i) => i - 1);
    }

    return (
        <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                {activeIndex + 1} of {uploads.length} incomplete
            </p>

            {/* Stack container */}
            <div className="relative w-full" style={{ height: 176 }}>
                <AnimatePresence initial={false} custom={direction}>
                    {uploads.map((upload, i) => {
                        const offset = i - activeIndex;

                        // Only render cards that are visible: active + 2 behind
                        if (offset < 0 || offset > 2) return null;

                        const isActive = offset === 0;

                        return (
                            <motion.div
                                key={upload.videoId}
                                className="absolute inset-x-0"
                                style={{
                                    zIndex: 10 - offset,
                                    touchAction: "none",
                                }}
                                initial={isActive ? { y: direction < 0 ? 140 : -140, opacity: 0, scale: 0.92 } : false}
                                animate={{
                                    y: offset * CARD_OFFSET,
                                    scale: 1 - offset * CARD_SCALE_STEP,
                                    opacity: 1 - offset * 0.2,
                                }}
                                exit={{ y: direction < 0 ? -140 : 140, opacity: 0, scale: 0.92 }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                drag={isActive ? "y" : false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.15}
                                dragMomentum={false}
                                whileDrag={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}
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
            {uploads.length > 1 && (
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
