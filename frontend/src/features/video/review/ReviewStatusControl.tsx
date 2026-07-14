import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/contexts/PermissionContext";
import { useReviewStatus } from "./useReviewStatus";
import type { ReviewStatus } from "@shared/review";

type ReviewStatusControlProps = {
  videoId: string;
  studyId: string;
  siteId: string;
};

/** @description Badge variant per review status (matches the reviews list). */
const STATUS_VARIANT: Record<ReviewStatus, "default" | "secondary" | "outline"> = {
  "reviewed": "default",
  "in review": "secondary",
  "not reviewed": "outline",
};

type Action = { label: string; next: ReviewStatus; variant: "default" | "outline" };

/** @description Contextual transition buttons for each status (adjacent-only). */
const ACTIONS: Record<ReviewStatus, Action[]> = {
  "not reviewed": [{ label: "Start review", next: "in review", variant: "default" }],
  "in review": [
    { label: "Mark reviewed", next: "reviewed", variant: "default" },
    { label: "Reopen", next: "not reviewed", variant: "outline" },
  ],
  "reviewed": [{ label: "Reopen", next: "in review", variant: "outline" }],
};

/**
 * @description Review-status badge plus the contextual transition button(s),
 * shown in the bottom review details strip. Buttons appear only for WRITE/ADMIN
 * users; READ-only users see the badge alone.
 *
 * @param props - Video/study/site identifiers for the VideoStudy row
 */
export function ReviewStatusControl({ videoId, studyId, siteId }: ReviewStatusControlProps) {
  const { canWrite } = usePermission();
  const { status, setStatus, isPending } = useReviewStatus(videoId, studyId, siteId);

  if (!status) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t-2 border-border bg-bg-light px-4 py-2 shadow-s">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Status
      </span>
      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      {canWrite &&
        ACTIONS[status].map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant={action.variant}
            disabled={isPending}
            onClick={() => setStatus(action.next)}
          >
            {action.label}
          </Button>
        ))}
    </div>
  );
}
