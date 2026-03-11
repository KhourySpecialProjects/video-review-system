import { Outlet, redirect } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/features/layout/Navbar";
import { auth } from "@/lib/auth.server";
import type { Route } from "./+types/root";

// ── Server Loader (runs before render) ────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    // If no session, redirect to sign-in
    if (!session) {
        throw redirect("/sign-in");
    }

    return {
        user: {
            name: session.user.name,
            email: session.user.email,
        },
    };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function RootLayout({ loaderData }: Route.ComponentProps) {
    return (
        <div className="flex min-h-screen flex-col bg-bg-dark">
            <Navbar user={loaderData.user} />
            <main className="mx-auto relative w-full max-w-7xl flex-1 px-4 py-6 md:px-8">
                <Toaster />
                <Outlet />
            </main>
        </div>
    );
}
