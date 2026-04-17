import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

/**
 * @description A pending clip-to-sequence morph source. Captures where the
 * "Add to sequence" button was clicked so a transient ghost can be rendered
 * at that exact position. The SequenceBar's destination card shares the same
 * layoutId, so motion/react animates from the ghost to the destination.
 */
type MorphSource = {
  clipId: string;
  rect: DOMRect;
  themeColor: string;
};

type ClipMorphContextValue = {
  /**
   * @description Called by the sidebar clip card when the user clicks
   * "Add to sequence". Captures the clicked element's bounding rect so the
   * destination card (in the SequenceBar) can morph from it.
   */
  triggerMorph: (clipId: string, rect: DOMRect, themeColor: string) => void;
  /** @description The layoutId to apply to the destination card for this clip. */
  morphLayoutId: (clipId: string) => string;
};

/**
 * @description Default no-op context used when a consumer renders outside a
 * provider (e.g. in unit tests that isolate the sidebar). The destination
 * layoutId is still returned so the SequenceBar renders correctly — the
 * morph simply won't fire until a provider is present.
 */
const defaultContext: ClipMorphContextValue = {
  triggerMorph: () => {},
  morphLayoutId: (clipId: string) => `clip-morph-${clipId}`,
};

const ClipMorphContext = createContext<ClipMorphContextValue>(defaultContext);

/**
 * @description Provides a shared-layout morph between a sidebar clip card
 * and its matching card in the SequenceBar. Renders a one-frame ghost at
 * the source rect, which then unmounts so motion/react picks up the
 * destination card as the continuation — producing a smooth morph from
 * the sidebar to the sequence bar.
 *
 * @param props - React children
 * @returns The provider element
 */
export function ClipMorphProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<MorphSource | null>(null);

  const triggerMorph = useCallback(
    (clipId: string, rect: DOMRect, themeColor: string) => {
      setSource({ clipId, rect, themeColor });
    },
    [],
  );

  const morphLayoutId = useCallback((clipId: string) => `clip-morph-${clipId}`, []);

  /**
   * @description Unmount the ghost on the next frame. That gives motion/react
   * one paint with the ghost mounted at the source rect, then when it
   * unmounts and the destination card mounts with the same layoutId,
   * motion animates from ghost position to destination position.
   */
  useEffect(() => {
    if (!source) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSource(null));
    });
    return () => cancelAnimationFrame(id);
  }, [source]);

  return (
    <ClipMorphContext.Provider value={{ triggerMorph, morphLayoutId }}>
      {children}
      {source &&
        createPortal(
          <motion.div
            layoutId={`clip-morph-${source.clipId}`}
            className="pointer-events-none fixed z-50 rounded-md border border-border bg-card shadow-md"
            style={{
              top: source.rect.top,
              left: source.rect.left,
              width: source.rect.width,
              height: source.rect.height,
              borderLeft: `4px solid ${source.themeColor}`,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />,
          document.body,
        )}
    </ClipMorphContext.Provider>
  );
}

/**
 * @description Hook for consumers that need to either trigger a morph
 * (sidebar clip cards) or render a destination card with the matching
 * layoutId (SequenceBar).
 *
 * @returns The clip morph context value
 * @throws If used outside a ClipMorphProvider
 */
export function useClipMorph(): ClipMorphContextValue {
  return useContext(ClipMorphContext);
}
