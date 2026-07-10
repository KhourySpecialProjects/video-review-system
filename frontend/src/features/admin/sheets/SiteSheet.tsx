import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";
import { X, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { formatRole } from "../columns/usersColumns";
import { formatStatus } from "../columns/studiesColumns";
import type { SiteDetailResponse } from "../admin.types";

/**
 * @description Side sheet for viewing a site's details. Allows adding
 * new studies to the site and unlinking existing studies. Data is
 * loaded via the site-detail resource route.
 *
 * @param siteId - The site to display.
 * @param open - Whether the sheet is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function SiteSheet({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailFetcher = useFetcher<SiteDetailResponse>();
  const actionFetcher = useFetcher();

  const [newStudyName, setNewStudyName] = useState("");

  useEffect(() => {
    if (open && siteId) {
      detailFetcher.load(`/admin/site-detail?siteId=${siteId}`);
    }
  }, [open, siteId]);

  const site = detailFetcher.data;
  const isLoading = detailFetcher.state === "loading";

  /** @description Reloads site detail after a mutation completes. */
  useEffect(() => {
    if (actionFetcher.state === "idle" && actionFetcher.data?.ok && siteId) {
      detailFetcher.load(`/admin/site-detail?siteId=${siteId}`);
    }
  }, [actionFetcher.state, actionFetcher.data]);

  /** @description Adds a new study to this site. */
  const handleAddStudy = useCallback(() => {
    if (!newStudyName.trim()) return;
    actionFetcher.submit(
      {
        intent: "addStudy",
        name: newStudyName.trim(),
        siteId,
      },
      { method: "post", action: "/admin/site-detail" },
    );
    setNewStudyName("");
  }, [actionFetcher, newStudyName, siteId]);

  /** @description Unlinks a study from this site. */
  const handleUnlinkStudy = useCallback(
    (studyId: string) => {
      actionFetcher.submit(
        {
          intent: "unlinkStudy",
          siteId,
          studyId,
        },
        { method: "post", action: "/admin/site-detail" },
      );
    },
    [actionFetcher, siteId],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Site Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {isLoading || !site ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{site.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Created {formatDate(site.createdAt)}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Studies ({site.studies.length})
                </h4>
                {site.studies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No studies.</p>
                ) : (
                  <ul className="space-y-2">
                    {site.studies.map((study) => (
                      <li
                        key={study.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{study.name}</span>
                          <Badge variant="outline" className="shrink-0">
                            {formatStatus(study.status)}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          aria-label={`Unlink ${study.name}`}
                          onClick={() => handleUnlinkStudy(study.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newStudyName}
                    onChange={(e) => setNewStudyName(e.target.value)}
                    placeholder="New study name..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddStudy();
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddStudy}
                    disabled={
                      !newStudyName.trim() || actionFetcher.state !== "idle"
                    }
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Users ({site.users.length})
                </h4>
                {site.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users.</p>
                ) : (
                  <ul className="space-y-2">
                    {site.users.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {formatRole(user.role)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
