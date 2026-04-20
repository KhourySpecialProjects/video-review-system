import { useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { AnimatePresence } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/features/layout/Navbar";

export type MainOutletContext = {
    mainRef: React.RefObject<HTMLElement | null>;
};

/**
 * @description Root layout shell. Wraps all routes with the navbar, toaster,
 * and an AnimatePresence for shared element transitions between pages.
 * Routes that need an edge-to-edge canvas (e.g. the clinical review page)
 * get an unpadded main via the `isFullBleed` branch.
 *
 * The `<main>` element is the app's primary scroll container (the shell
 * uses `h-screen overflow-hidden`). Its ref is handed to the `Navbar`
 * directly so it can drive scroll-based animations, and is also exposed
 * to descendant routes via Outlet context for the same reason.
 */
export default function Root() {
    const location = useLocation();
    const isFullBleed = location.pathname.startsWith("/review/");
    const mainRef = useRef<HTMLElement | null>(null);

    const outletContext: MainOutletContext = { mainRef };

    return (
        <TooltipProvider>
            <div className="flex h-screen flex-col overflow-hidden bg-bg-dark">
                <Navbar scrollContainerRef={mainRef} />
                <main
                    ref={mainRef}
                    className={
                        isFullBleed
                            ? "relative w-full flex-1 overflow-auto"
                            : "mx-auto relative flex w-full flex-1 flex-col overflow-auto px-4 py-6 md:px-8"
                    }
                >
                    <Toaster />
                    <AnimatePresence mode="wait">
                        <Outlet key={location.pathname} context={outletContext} />
                    </AnimatePresence>
                </main>
            </div>
        </TooltipProvider>
    );
}
