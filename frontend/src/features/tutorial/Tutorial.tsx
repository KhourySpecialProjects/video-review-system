import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TutorialCategory } from "@/lib/types";
import { BookOpen, Play, FileText, ExternalLink, Layers } from "lucide-react";

const CATEGORY_ICONS = [BookOpen, Layers, FileText];

export function Tutorial({ data }: { data: TutorialCategory[] }) {
    return (
        <div className="flex flex-col gap-4">
            {data.map((item, idx) => {
                const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
                return (
                    <Card key={item.title} className="border-border bg-bg-light shadow-m!">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                        <Icon className="size-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-text">
                                        {item.title}
                                    </CardTitle>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {item.tutorials.length} {item.tutorials.length === 1 ? "lesson" : "lessons"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Accordion className="w-full">
                                {item.tutorials.map((tutorial) => (
                                    <AccordionItem key={tutorial.title} value={tutorial.title}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-2">
                                                {tutorial.type === "video" ? (
                                                    <Play className="size-3.5 shrink-0 text-primary" />
                                                ) : (
                                                    <FileText className="size-3.5 shrink-0 text-text-muted" />
                                                )}
                                                <span>{tutorial.title}</span>
                                                <Badge
                                                    variant={tutorial.type === "video" ? "default" : "outline"}
                                                    className="ml-1 px-1.5 py-0 text-[10px]"
                                                >
                                                    {tutorial.type === "video" ? "Video" : "Article"}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="rounded-lg border border-border bg-bg-dark p-4">
                                                {tutorial.type === "video" ? (
                                                    <a
                                                        href={tutorial.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                                                    >
                                                        <Play className="size-4 shrink-0" />
                                                        Watch: {tutorial.title}
                                                        <ExternalLink className="size-3 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-text-muted">{tutorial.content}</p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
