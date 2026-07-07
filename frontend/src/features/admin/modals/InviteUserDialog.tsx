import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { FieldError } from "@/components/ui/field";
import type { SiteOptionsResponse } from "../admin.types";

/** @description Role display labels. */
const roleLabels: Record<string, string> = {
  CAREGIVER: "Caregiver",
  CLINICAL_REVIEWER: "Clinical Reviewer",
  SITE_COORDINATOR: "Site Coordinator",
  SYSADMIN: "System Admin",
};

/**
 * @description Dialog for inviting a new user. Submits via fetcher.Form
 * to the /admin/invite resource route where Zod validation runs in the
 * action. Field errors are displayed from the action response. Role
 * options are restricted for site coordinators. Closes on success.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Handler for open state changes.
 * @param actorRole - The current user's role (restricts available roles).
 */
export function InviteUserDialog({
  open,
  onOpenChange,
  actorRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: string;
}) {
  const fetcher = useFetcher<{ ok: boolean; fieldErrors?: Record<string, string[]> }>();
  const sitesFetcher = useFetcher<SiteOptionsResponse>();

  useEffect(() => {
    if (open) {
      sitesFetcher.load("/sites/options");
    }
  }, [open]);

  const siteOptions = sitesFetcher.data?.sites ?? [];
  const fieldErrors = fetcher.data?.fieldErrors;

  /** @description Available roles based on the actor's role. */
  const availableRoles =
    actorRole === "SITE_COORDINATOR"
      ? ["CAREGIVER", "CLINICAL_REVIEWER"]
      : ["CAREGIVER", "CLINICAL_REVIEWER", "SITE_COORDINATOR", "SYSADMIN"];

  /** @description Close dialog when the action completes successfully. */
  const prevState = useRef(fetcher.state);
  useEffect(() => {
    if (
      prevState.current !== "idle" &&
      fetcher.state === "idle" &&
      fetcher.data?.ok
    ) {
      onOpenChange(false);
    }
    prevState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        <fetcher.Form
          method="post"
          action="/admin/invite"
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="user@example.com"
            />
            {fieldErrors?.email && (
              <FieldError>{fieldErrors.email[0]}</FieldError>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select name="role">
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors?.role && (
              <FieldError>{fieldErrors.role[0]}</FieldError>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select name="siteId">
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {siteOptions.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors?.siteId && (
              <FieldError>{fieldErrors.siteId[0]}</FieldError>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={fetcher.state !== "idle"}>
              Send Invitation
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
