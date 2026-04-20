import { Link } from "react-router";
import { Sun, Moon, LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useTheme } from "@/hooks/use-theme";
import { useLogout } from "@/hooks/use-logout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIncompleteUploads } from "./useIncompleteUploads";
import { UploadCardStack } from "./UploadCardStack";
import { DesktopUploadIndicator } from "./DesktopUploadIndicator";
import { Spinner } from "@/components/ui/spinner";

type NavbarProps = {
    scrollContainerRef: React.RefObject<HTMLElement | null>;
};

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
    const { theme, toggleTheme } = useTheme();
    const logout = useLogout();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
    const { uploads, busy, isLoading, fileInputRef, onResume, onCancel, onFileChange } =
        useIncompleteUploads();

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

    // Stay visible while the mobile menu is open so it doesn't scroll
    // away under the user's finger.
    const hide = scrollDirection === "down" && !menuOpen;

    return (
        <motion.nav
            variants={{
                visible: { y: 0, height: "auto" },
                hidden: { y: "-100%", height: 0 },
            }}
            animate={hide ? "hidden" : "visible"}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            // `overflow-hidden` is needed during the height collapse so
            // the buttons don't spill out below the shrinking nav — but
            // when the mobile dropdown is open (rendered at `top-full`
            // below the nav) we need `overflow-visible` or the dropdown
            // gets clipped. The menu can't be open while `hide` is true
            // (see the `hide` expression above), so this is safe.
            className={
                "sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-bg-light px-4 py-2.5 shadow-s " +
                (menuOpen ? "overflow-visible" : "overflow-hidden")
            }
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                className="hidden"
                onChange={onFileChange}
            />

            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    CV
                </div>
            </Link>

            <div className="flex items-center gap-1">
                <div className="hidden items-center gap-1 md:flex">
                    <Link
                        to="/tutorials"
                        className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all"
                    >
                        Tutorial
                    </Link>
                </div>

                <div className="hidden md:block">
                    <DesktopUploadIndicator
                        uploads={uploads}
                        busy={busy}
                        onResume={onResume}
                        onCancel={onCancel}
                    />
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="text-text"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden text-destructive md:inline-flex"
                    onClick={logout}
                    aria-label="Log out"
                >
                    <LogOut className="size-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-text md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={menuOpen ? "close" : "open"}
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="inline-flex"
                        >
                            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </motion.span>
                    </AnimatePresence>
                    {uploads.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                            {uploads.length}
                        </span>
                    )}
                </Button>
            </div>

            <AnimatePresence initial={false}>
                {menuOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="absolute left-0 top-full w-full overflow-hidden border-b border-border/50 bg-bg-light z-50 md:hidden"
                    >
                        <div className="flex flex-col gap-2 p-4">
                            {isLoading ? (
                                <div className="flex justify-center py-3">
                                    <Spinner />
                                </div>
                            ) : (
                                <UploadCardStack
                                    uploads={uploads}
                                    busy={busy}
                                    onResume={onResume}
                                    onCancel={onCancel}
                                />
                            )}

                            <Link
                                to="/tutorials"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text hover:bg-muted transition-all"
                            >
                                Tutorial
                            </Link>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    logout();
                                }}
                                className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-destructive hover:bg-muted transition-all"
                                aria-label="Log out"
                            >
                                <LogOut className="mr-2 size-4" />
                                Log out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
