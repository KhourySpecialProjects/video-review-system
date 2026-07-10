import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Hospital, Shield, User } from "lucide-react";
import type { ReviewVideo, ReviewStatus, PermissionLevel } from "./types";

/** @description Maps review status to the appropriate badge variant */
const REVIEW_STATUS_VARIANT: Record<ReviewStatus, "default" | "secondary" | "outline"> = {
    "reviewed": "default",
    "in review": "secondary",
    "not reviewed": "outline",
};

/** @description Maps permission level to a human-readable label */
const PERMISSION_LABEL: Record<PermissionLevel, string> = {
    read: "Read",
    write: "Write",
    admin: "Admin",
};

/**
 * @description Displays a single review video as a metadata card.
 * Shows required fields (review status, study, site, permission level)
 * and optional fields (title, reviewer name, tags).
 * @param {ReviewVideo} video - The review video data to display
 */
export function ReviewCard({
    id,
    studyId,
    siteId,
    title,
    reviewerName,
    tags,
    reviewStatus,
    studyName,
    siteName,
    permissionLevel,
}: ReviewVideo) {
    return (
        <Link to={`/review/${id}/${studyId}/${siteId}`} className="block">
            <Card
                size="sm"
                className="group transition-shadow hover:shadow-l"
            >
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <Badge variant={REVIEW_STATUS_VARIANT[reviewStatus]}>
                            {reviewStatus}
                        </Badge>
                        <Badge variant="outline">
                            <Shield data-icon="inline-start" />
                            {PERMISSION_LABEL[permissionLevel]}
                        </Badge>
                    </div>
                    {title && (
                        <CardTitle className="truncate">{title}</CardTitle>
                    )}
                </CardHeader>

                <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <FlaskConical className="size-4 shrink-0" />
                            <span className="truncate">{studyName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Hospital className="size-4 shrink-0" />
                            <span className="truncate">{siteName}</span>
                        </div>
                        {reviewerName && (
                            <div className="flex items-center gap-2">
                                <User className="size-4 shrink-0" />
                                <span className="truncate">{reviewerName}</span>
                            </div>
                        )}
                    </div>
                </CardContent>

                {tags && tags.length > 0 && (
                    <CardFooter>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </CardFooter>
                )}
            </Card>
        </Link>
    );
}

/**
 * @description Skeleton loading placeholder for the ReviewCard component.
 * Mimics the card layout with animated skeleton elements.
 */
export function ReviewCardSkeleton() {
    return (
        <Card size="sm">
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-4 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-4 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-4 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </CardContent>

            <CardFooter>
                <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-18 rounded-full" />
                </div>
            </CardFooter>
        </Card>
    );
}
