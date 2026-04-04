import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/features/layout/Navbar";

export default function Root() {
    return (
        <TooltipProvider>
            <div className="flex h-screen flex-col overflow-hidden bg-bg-dark">
                <Navbar />
                <main className="mx-auto relative flex w-full flex-1 flex-col overflow-auto px-4 py-6 md:px-8">
                    <Toaster />
                    <Outlet />
                </main>
            </div>
        </TooltipProvider>
    );
}
