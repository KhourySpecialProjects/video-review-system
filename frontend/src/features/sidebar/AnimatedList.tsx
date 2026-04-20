import { motion, AnimatePresence, LayoutGroup } from "motion/react"
import type { ReactNode } from "react"

type AnimatedListProps = {
  children: ReactNode
}

/**
 * @description Wraps a list of animated rows so layout transitions share a
 * group — reorders, size changes, and inserts/removes animate smoothly
 * between siblings. Exits are animated via AnimatePresence.
 *
 * @param props - Component props
 * @returns The animated list wrapper
 */
export function AnimatedList({ children }: AnimatedListProps) {
  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout" initial={false}>
        {children}
      </AnimatePresence>
    </LayoutGroup>
  )
}

type AnimatedRowProps = {
  layoutId: string
  index?: number
  children: ReactNode
}

const entry = { opacity: 0, y: 8, scale: 0.98 }
const center = { opacity: 1, y: 0, scale: 1 }
const exit = { opacity: 0, y: -8, scale: 0.96 }

/**
 * @description A single list row that animates its entry, layout changes,
 * and removal. Entries stagger slightly by index for an elegant cascade.
 *
 * @param props - Component props
 * @returns The animated row wrapper
 */
export function AnimatedRow({ layoutId, index = 0, children }: AnimatedRowProps) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={entry}
      animate={center}
      exit={exit}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 34 },
        opacity: { duration: 0.24, ease: "easeOut", delay: Math.min(index, 8) * 0.035 },
        y: { type: "spring", stiffness: 420, damping: 32, delay: Math.min(index, 8) * 0.035 },
        scale: { duration: 0.24, ease: "easeOut", delay: Math.min(index, 8) * 0.035 },
      }}
    >
      {children}
    </motion.div>
  )
}
