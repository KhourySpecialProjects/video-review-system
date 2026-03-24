import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/features/layout/Navbar";

export default function Root() {
    return (
        <div className="flex min-h-screen flex-col bg-bg-dark">
            <Navbar />
            <main className="mx-auto relative w-full max-w-7xl flex-1 px-4 py-6 md:px-8">
                <Toaster />
                <Outlet />
            </main>
        </div>
    );
}
