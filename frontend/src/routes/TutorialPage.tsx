import type { TutorialCategory } from "@/lib/types";
import { Suspense } from "react";
import { useLoaderData, Await } from "react-router";
import { Tutorial } from "@/features/tutorial/Tutorial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

export default function TutorialPage() {
    const { tutorialPromise } = useLoaderData() as { tutorialPromise: Promise<TutorialCategory[]> };

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-5xl">
            <Card className="border-border bg-bg-light shadow-m!">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <BookOpen className="size-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                                Learning Center
                            </CardTitle>
                            <p className="mt-1 text-lg font-bold text-text">Tutorials & Guides</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-text-muted">
                        Browse step-by-step guides and video walkthroughs to get the most out of the portal.
                    </p>
                </CardContent>
            </Card>

            <Suspense fallback={<TutorialSkeleton />}>
                <Await resolve={tutorialPromise}>
                    {(tutorials: TutorialCategory[]) => <Tutorial data={tutorials} />}
                </Await>
            </Suspense>
        </div>
    );
}

export function TutorialSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
                <Card key={i} className="border-border bg-bg-light">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-lg" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {[1, 2, 3].map((j) => (
                            <Skeleton key={j} className="h-12 w-full rounded-md" />
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
