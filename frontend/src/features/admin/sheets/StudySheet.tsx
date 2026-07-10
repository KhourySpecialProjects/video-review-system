import { useState, useCallback } from "react";
import { useFetcher } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { StudyCaregiverPicker } from "./StudyCaregiverPicker";
import type { StudyListItem } from "../admin.types";

/**
 * @description Side sheet for viewing and editing a study. Supports
 * renaming, changing status, and adding caregivers. The parent should
 * render this with `key={study.id}` so state resets on study change.
 *
 * @param study - The study to display (from row click).
 * @param open - Whether the sheet is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function StudySheet({
  study,
  open,
  onOpenChange,
}: {
  study: StudyListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actionFetcher = useFetcher();
  const [name, setName] = useState(study.name);
  const [status, setStatus] = useState(study.status);

  /** @description Whether name or status has been modified. */
  const hasChanges = name !== study.name || status !== study.status;

  /** @description Saves name and/or status changes. */
  const handleSave = useCallback(() => {
    const updates: Record<string, string> = {
      intent: "updateStudy",
      studyId: study.id,
    };
    if (name !== study.name) updates.name = name;
    if (status !== study.status) updates.status = status;

    actionFetcher.submit(updates, {
      method: "post",
      action: "/admin/study-detail",
    });
  }, [actionFetcher, study, name, status]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Study Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="studyName">Name</Label>
            <Input
              id="studyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus((v ?? status) as typeof status)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="FINISHED">Finished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={actionFetcher.state !== "idle"}
            >
              Save Changes
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            Created {formatDate(study.createdAt)}
          </p>

          <div className="space-y-1">
            <Label>Sites</Label>
            <div className="flex flex-wrap gap-1">
              {study.sites.map((site) => (
                <Badge key={site.id} variant="outline">
                  {site.name}
                </Badge>
              ))}
              {study.sites.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Not linked to any site.
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Caregivers</Label>
            <StudyCaregiverPicker studyId={study.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
