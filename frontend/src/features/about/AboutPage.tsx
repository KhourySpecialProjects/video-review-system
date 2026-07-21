import { Link } from "react-router";
import { ArrowLeft, ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppVersion } from "@/features/layout/AppVersion";
import { cn } from "@/lib/utils";

/**
 * @description Public About page at `/about`. Reachable both signed-out (via
 * the "About Asclepion" link on public pages) and signed-in (via the "About"
 * item in the account menu). Deliberately standalone — no app navbar/shell —
 * mirroring {@link Landing}'s conventions, with a "Back" link that resolves to
 * the visitor's home (`/` redirects logged-in users to their role home). Links
 * out to the end-user changelog.
 */
export function AboutPage() {
    return (
        <div className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden">
            {/* Quiet warm glow behind the hero — matches the landing page. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />

            <header className="flex items-center justify-between p-4">
                <Link
                    to="/"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text")}
                >
                    <ArrowLeft className="size-4" />
                    Back
                </Link>
                <ThemeToggle />
            </header>

            <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 text-center">
                <div
                    aria-hidden="true"
                    className="flex size-20 items-center justify-center rounded-3xl bg-primary text-4xl font-bold text-primary-foreground shadow-l"
                >
                    A
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                    About Asclepion
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
                    Asclepion is a secure video management portal for Angelman Syndrome
                    research. It helps families and caregivers share videos of their loved
                    ones, and gives clinical reviewers the tools to organize, annotate, and
                    review that footage — all in one place.
                </p>
                <p className="max-w-xl leading-relaxed text-balance text-muted-foreground">
                    Built in collaboration with Boston Children&apos;s Hospital, Asclepion
                    brings caregivers, site coordinators, clinical reviewers, and
                    administrators together to advance Angelman Syndrome research.
                </p>
                <Link
                    to="/changelog"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-2")}
                >
                    <ScrollText className="size-4" />
                    What&apos;s new
                </Link>
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-6 text-center text-xs text-muted-foreground">
                <span>Angelman Syndrome Video Management Portal</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span>In collaboration with Boston Children&apos;s Hospital</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <AppVersion />
            </footer>
        </div>
    );
}
