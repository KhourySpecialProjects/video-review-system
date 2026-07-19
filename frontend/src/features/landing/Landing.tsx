import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppVersion } from "@/features/layout/AppVersion";
import { cn } from "@/lib/utils";

/**
 * @description Public landing page — the app's front door at `/`, shown only
 * to logged-out visitors. Authenticated users never reach it: the route's
 * splitter loader (`landingLoader`) redirects them to their role home before
 * this renders. Deliberately minimal — no app navbar/shell, just brand,
 * tagline, and a login CTA — and built entirely from existing design tokens.
 */
export function Landing() {
    return (
        <div className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden">
            {/* Quiet warm glow behind the hero — the only decorative flourish. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />

            <header className="flex justify-end p-4">
                <ThemeToggle />
            </header>

            <main className="flex flex-col items-center justify-center gap-6 px-6 text-center">
                <div
                    aria-hidden="true"
                    className="flex size-24 items-center justify-center rounded-3xl bg-primary text-5xl font-bold text-primary-foreground shadow-l"
                >
                    A
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
                    Asclepion
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-balance text-muted-foreground">
                    Helping families, caregivers, and clinicians advance Angelman
                    Syndrome research together.
                </p>
                <Link
                    to="/login"
                    className={cn(buttonVariants({ size: "lg" }), "mt-2")}
                >
                    Log in
                    <ArrowRight className="size-4" />
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
