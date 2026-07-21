import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRole } from "../columns/usersColumns";
import type { UserDetailResponse, SiteOptionsResponse } from "../admin.types";

/** @description Permission level display labels. */
const levelLabels: Record<string, string> = {
  READ: "Read",
  WRITE: "Write",
  EXPORT: "Export",
  ADMIN: "Admin",
};

/**
 * @description Modal dialog for viewing and editing a user's details,
 * permissions, and activation status. Data is loaded via the
 * user-detail resource route. Changes apply immediately (each action
 * fires a mutation on click), so there is no Save button — only "Done".
 * Permission level options are restricted for site coordinators
 * (only READ/WRITE).
 *
 * @param userId - The user to display.
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Handler for open state changes.
 * @param actorRole - The current user's role (restricts permission options).
 */
export function EditUserDialog({
  userId,
  open,
  onOpenChange,
  actorRole,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: string;
}) {
  const detailFetcher = useFetcher<UserDetailResponse>();
  const sitesFetcher = useFetcher<SiteOptionsResponse>();
  const actionFetcher = useFetcher();

  const [permLevel, setPermLevel] = useState("");
  const [permSiteId, setPermSiteId] = useState("");

  useEffect(() => {
    if (open && userId) {
      detailFetcher.load(`/admin/user-detail?userId=${userId}`);
      sitesFetcher.load("/sites/options");
    }
  }, [open, userId]);

  const user = detailFetcher.data;
  const siteOptions = sitesFetcher.data?.sites ?? [];
  const isLoading = detailFetcher.state === "loading";

  /** @description Reloads user detail after a mutation completes. */
  useEffect(() => {
    if (actionFetcher.state === "idle" && actionFetcher.data?.ok && userId) {
      detailFetcher.load(`/admin/user-detail?userId=${userId}`);
    }
  }, [actionFetcher.state, actionFetcher.data]);

  /** @description Toggles the user's deactivation status. */
  const handleToggleStatus = useCallback(() => {
    if (!user) return;
    actionFetcher.submit(
      {
        intent: "updateUserStatus",
        userId: user.id,
        isDeactivated: String(!user.isDeactivated),
      },
      { method: "post", action: "/admin" },
    );
  }, [actionFetcher, user]);

  /** @description Deletes a single permission from the user. */
  const handleDeletePermission = useCallback(
    (permissionId: string) => {
      if (!user) return;
      actionFetcher.submit(
        {
          intent: "deletePermission",
          userId: user.id,
          permissionId,
        },
        { method: "post", action: "/admin" },
      );
    },
    [actionFetcher, user],
  );

  /** @description Adds a new permission to the user. */
  const handleAddPermission = useCallback(() => {
    if (!user || !permLevel) return;
    actionFetcher.submit(
      {
        intent: "createPermission",
        userId: user.id,
        permissionLevel: permLevel,
        siteId: permSiteId || "",
        studyId: "",
        videoId: "",
      },
      { method: "post", action: "/admin" },
    );
    setPermLevel("");
    setPermSiteId("");
  }, [actionFetcher, user, permLevel, permSiteId]);

  /** @description Permission levels available based on actor role. */
  const availableLevels =
    actorRole === "SITE_COORDINATOR"
      ? ["READ", "WRITE"]
      : ["READ", "WRITE", "EXPORT", "ADMIN"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Changes are saved automatically.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto">
          {isLoading || !user ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2">
                  <Badge>{formatRole(user.role)}</Badge>
                  <Badge
                    variant={user.isDeactivated ? "destructive" : "default"}
                  >
                    {user.isDeactivated ? "Deactivated" : "Active"}
                  </Badge>
                </div>
              </div>

              <Button
                variant={user.isDeactivated ? "default" : "destructive"}
                size="sm"
                onClick={handleToggleStatus}
                disabled={actionFetcher.state !== "idle"}
              >
                {user.isDeactivated ? "Reactivate" : "Deactivate"}
              </Button>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Permissions</h4>
                {user.userPermissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No explicit permissions.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {user.userPermissions.map((perm) => (
                      <li
                        key={perm.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {levelLabels[perm.permissionLevel] ??
                              perm.permissionLevel}
                          </Badge>
                          <span className="text-muted-foreground">
                            {perm.siteId
                              ? `Site: ${perm.siteName ?? `${perm.siteId.slice(0, 8)}…`}`
                              : perm.studyId
                                ? `Study: ${perm.studyName ?? `${perm.studyId.slice(0, 8)}…`}`
                                : "Global"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePermission(perm.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Add Permission</h4>
                <div className="flex flex-wrap gap-2">
                  <Select value={permLevel} onValueChange={(v) => setPermLevel(v ?? "")}>
                    <SelectTrigger className="h-8 w-36 text-sm">
                      <SelectValue placeholder="Level">
                        {(value: string | null) =>
                          value ? (levelLabels[value] ?? value) : "Level"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {levelLabels[level] ?? level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={permSiteId} onValueChange={(v) => setPermSiteId(v ?? "")}>
                    <SelectTrigger className="h-8 w-44 text-sm">
                      <SelectValue placeholder="Site (optional)">
                        {(value: string | null) =>
                          value
                            ? (siteOptions.find((s) => s.id === value)?.name ??
                              "Site (optional)")
                            : "Site (optional)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Global</SelectItem>
                      {siteOptions.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleAddPermission}
                    disabled={!permLevel || actionFetcher.state !== "idle"}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
