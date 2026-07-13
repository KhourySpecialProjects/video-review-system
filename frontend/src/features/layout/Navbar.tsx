import { Link } from "react-router";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { useIncompleteUploads } from "./useIncompleteUploads";
import { DesktopUploadIndicator } from "./DesktopUploadIndicator";
import { UserMenu } from "./UserMenu";

type NavbarProps = {
    scrollContainerRef: React.RefObject<HTMLElement | null>;
};

/** @description Shared styles for desktop nav links. */
const desktopLinkClass =
    "inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all";

/**
 * @description Top navigation bar. Slides out of view when the user
 * scrolls down and drops back into place when they scroll up. The app
 * shell scrolls inside `<main>` (root.tsx sets `h-screen overflow-hidden`
 * and makes `<main>` the overflow-auto container), so the scroll
 * container ref is passed in from the root layout.
 *
 * @param scrollContainerRef - Ref to the scroll container element
 *   (normally the app's `<main>`) that drives the scroll-direction
 *   visibility logic.
 */
export function Navbar({ scrollContainerRef }: NavbarProps) {
    const { user } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
    const { uploads, busy, isCaregiver, fileInputRef, onResume, onCancel, onFileChange } =
        useIncompleteUploads();

    /** @description Reviews is open to every authenticated non-caregiver. */
    const showReviews = !!user?.role && user.role !== "CAREGIVER";
    /** @description Admin is guarded to SYSADMIN and SITE_COORDINATOR only. */
    const showAdmin = user?.role === "SYSADMIN" || user?.role === "SITE_COORDINATOR";

    const { scrollY } = useScroll({ container: scrollContainerRef });

    useMotionValueEvent(scrollY, "change", (current) => {
        const diff = current - (scrollY.getPrevious() ?? 0);
        // Ignore tiny wobbles (momentum tails, overscroll rubber-band at
        // the top or bottom of the container) so the nav doesn't flicker
        // in and out of view when the user isn't really scrolling.
        if (Math.abs(diff) < 5) return;
        const el = scrollContainerRef.current;
        if (el) {
            const atBottom = current + el.clientHeight >= el.scrollHeight - 2;
            if (atBottom) return;
        }
        const next = diff > 0 ? "down" : "up";
        setScrollDirection((prev) => (prev === next ? prev : next));
    });

    // Stay visible while a menu/popover is open so it doesn't scroll away
    // under the user's finger.
    const hide = scrollDirection === "down" && !userMenuOpen && !uploadOpen;

    return (
        <motion.nav
            variants={{
                visible: { y: 0, height: "auto" },
                hidden: { y: "-100%", height: 0 },
            }}
            animate={hide ? "hidden" : "visible"}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-bg-light px-4 py-2.5 shadow-s overflow-hidden"
        >
            {isCaregiver && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo"
                    className="hidden"
                    onChange={onFileChange}
                />
            )}

            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    A
                </div>
                <span className="hidden sm:inline">Asclepion</span>
            </Link>

            <div className="flex items-center gap-1">
                <div className="hidden items-center gap-1 md:flex">
                    {showReviews && (
                        <Link to="/reviews" className={desktopLinkClass}>
                            Reviews
                        </Link>
                    )}
                    {showAdmin && (
                        <Link to="/admin" className={desktopLinkClass}>
                            Admin
                        </Link>
                    )}
                </div>

                {isCaregiver && (
                    <DesktopUploadIndicator
                        uploads={uploads}
                        busy={busy}
                        onResume={onResume}
                        onCancel={onCancel}
                        onOpenChange={setUploadOpen}
                    />
                )}

                <UserMenu onOpenChange={setUserMenuOpen} />
            </div>
        </motion.nav>
    );
}
