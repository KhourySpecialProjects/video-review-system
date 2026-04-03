/**
 * A completed clip with start and end time boundaries in seconds.
 *
 * Created after the user clicks twice on the timeline to define
 * a start and end boundary.
 *
 * @example
 * ```ts
 * const clip: ClipRange = { startTime: 10, endTime: 45 };
 * ```
 */
export type ClipRange = {
    /** Start time of the clip in seconds. */
    startTime: number;
    /** End time of the clip in seconds. */
    endTime: number;
};

/**
 * Phase of the clip selection state machine.
 *
 * - `"idle"` — no selection in progress; waiting for the first click.
 * - `"selecting"` — start time is pinned; hovering previews the region;
 *   a second click completes the clip.
 *
 * @example
 * ```ts
 * const phase: ClipSelectionPhase = "idle";
 * ```
 */
export type ClipSelectionPhase = "idle" | "selecting";

/**
 * Props accepted by the `ClipTimeline` component.
 *
 * The component is purely presentational — all state and handlers
 * come from the `useClipTimeline` hook, which should be called in the
 * parent so siblings can also access clips.
 *
 * @example
 * ```tsx
 * const timeline = useClipTimeline(120, videoRef);
 * <ClipTimeline duration={120} timeline={timeline} />
 * ```
 */
export type ClipTimelineProps = {
    /** Total video duration in seconds. */
    duration: number;
    /** State and handlers returned by `useClipTimeline`. */
    timeline: UseClipTimelineReturn;
};

/**
 * CSS positioning values for rendering a region on the timeline track.
 *
 * Both `left` and `width` are percentage strings (e.g. `"25%"`)
 * intended for use as inline styles.
 *
 * @example
 * ```ts
 * const region: SelectionRegion = { left: "25%", width: "50%" };
 * ```
 */
export type SelectionRegion = {
    /** CSS `left` value as a percentage string, e.g. `"25%"`. */
    left: string;
    /** CSS `width` value as a percentage string, e.g. `"50%"`. */
    width: string;
};

/**
 * Return value of the `useClipTimeline` hook.
 *
 * Exposes the current state of the clip selection state machine
 * and event handlers to wire up to the timeline track element.
 *
 * @example
 * ```ts
 * const { phase, clips, onTrackClick } = useClipTimeline(120, videoRef);
 * ```
 */
export type UseClipTimelineReturn = {
    /** Current phase of the selection workflow. */
    phase: ClipSelectionPhase;
    /** Pinned start time in seconds, or `null` when idle. */
    startTime: number | null;
    /** Current hover time in seconds, or `null` when not hovering. */
    hoverTime: number | null;
    /** All completed clips created so far. */
    clips: ClipRange[];
    /**
     * Removes a clip by its index in the `clips` array.
     *
     * @param index - Zero-based index of the clip to remove.
     */
    removeClip: (index: number) => void;
    /**
     * Handler for `mousemove` on the track.
     * Scrubs the video and updates the hover needle position.
     *
     * @param clientX - The mouse event's `clientX` coordinate.
     * @param rect - The track element's bounding client rect.
     */
    onTrackMouseMove: (clientX: number, rect: DOMRect) => void;
    /** Handler for `mouseleave` on the track. Clears hover state. */
    onTrackMouseLeave: () => void;
    /**
     * Handler for `click` on the track.
     * Advances the selection state machine (idle → selecting → clip created).
     *
     * @param clientX - The mouse event's `clientX` coordinate.
     * @param rect - The track element's bounding client rect.
     */
    onTrackClick: (clientX: number, rect: DOMRect) => void;
};
