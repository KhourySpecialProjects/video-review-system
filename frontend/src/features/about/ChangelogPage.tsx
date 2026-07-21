import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppVersion } from "@/features/layout/AppVersion";
import { cn } from "@/lib/utils";
import { changelog } from "./changelog";

/**
 * @description Fixed UTC date formatter so an entry dated `2026-07-20` reads as
 * "July 20, 2026" regardless of the viewer's timezone (a bare `new Date(iso)`
 * parses at UTC midnight and can render the previous day in western zones).
 */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
});

/**
 * @description Public changelog page at `/changelog`, linked from the About
 * page. Renders the end-user-facing {@link changelog} entries newest-first as a
 * simple dated timeline. Standalone (no app shell), mirroring the About page.
 */
export function ChangelogPage() {
    return (
        <div className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />

            <header className="flex items-center justify-between p-4">
                <Link
                    to="/about"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text")}
                >
                    <ArrowLeft className="size-4" />
                    Back to About
                </Link>
                <ThemeToggle />
            </header>

            <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-4">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                        What&apos;s new
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        Recent improvements to the Asclepion portal.
                    </p>
                </div>

                <ol className="flex flex-col gap-8">
                    {changelog.map((entry) => (
                        <li key={entry.date} className="border-l-2 border-primary/30 pl-5">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h2 className="text-lg font-semibold text-text">
                                    {dateFormatter.format(new Date(entry.date))}
                                </h2>
                                {entry.version && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                        v{entry.version}
                                    </span>
                                )}
                            </div>
                            <ul className="mt-3 flex flex-col gap-2">
                                {entry.highlights.map((highlight, i) => (
                                    <li
                                        key={i}
                                        className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60"
                                        />
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
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
