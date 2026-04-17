import { Outlet, useLocation } from "react-router";
import { AnimatePresence } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/features/layout/Navbar";

/**
 * @description Root layout shell. Wraps all routes with the navbar, toaster,
 * and an AnimatePresence for shared element transitions between pages.
 */
export default function Root() {
    const location = useLocation();

    return (
        <TooltipProvider>
            <div className="flex h-screen flex-col overflow-hidden bg-bg-dark">
                <Navbar />
                <main className="mx-auto relative flex w-full flex-1 flex-col overflow-auto px-4 py-6 md:px-8">
                    <Toaster />
                    <AnimatePresence mode="wait">
                        <Outlet key={location.pathname} />
                    </AnimatePresence>
                </main>
            </div>
        </TooltipProvider>
    );
}
