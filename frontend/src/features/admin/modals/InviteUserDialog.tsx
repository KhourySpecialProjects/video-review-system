import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Check, Copy } from "lucide-react";
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

/** @description Shape of the /admin/invite action response (see invite.route.ts). */
type InviteActionData =
  | { ok: true; token?: string; expiresAt?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * @description Read-only copyable signup link with a transient "Copied!"
 * confirmation. Builds nothing itself — it renders the URL it is handed.
 *
 * @param url - The full signup URL to display and copy.
 */
function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  /** @description Copy the URL and briefly flip the button to a confirmed state. */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (e.g. non-secure context) — the URL stays visible
      // and selectable, so the user can copy it manually.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="font-mono text-xs" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        aria-label={copied ? "Signup link copied" : "Copy signup link"}
      >
        {copied ? (
          <>
            <Check className="size-4" /> Copied!
          </>
        ) : (
          <>
            <Copy className="size-4" /> Copy
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * @description Dialog for inviting a new user. Two states:
 *
 * 1. **Form** — email / role / site, submitted via fetcher.Form to the
 *    /admin/invite resource route (Zod validation runs in the action; field
 *    errors are rendered from the response; roles are restricted for site
 *    coordinators).
 * 2. **Link ready** — shown once the action returns a token. Surfaces a
 *    copyable `/signup/:token` URL built from the inviter's own origin so it
 *    works regardless of host, plus an expiry note and Invite another / Done.
 *
 * The backend also emails the link; this view is the no-email-needed path.
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
  // A monotonically increasing key gives us a fresh fetcher (no stale token)
  // each time the dialog opens or the user chooses "Invite another".
  const [formKey, setFormKey] = useState(0);
  const fetcher = useFetcher<InviteActionData>({ key: `invite-user-${formKey}` });
  const sitesFetcher = useFetcher<SiteOptionsResponse>();

  useEffect(() => {
    if (open) {
      sitesFetcher.load("/sites/options");
      // Reset to a clean form whenever the dialog is (re)opened.
      setFormKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const siteOptions = sitesFetcher.data?.sites ?? [];
  const fieldErrors =
    fetcher.data && !fetcher.data.ok ? fetcher.data.fieldErrors : undefined;

  const token = fetcher.data?.ok ? fetcher.data.token : undefined;
  const signupUrl = token
    ? `${window.location.origin}/signup/${token}`
    : undefined;

  /** @description Available roles based on the actor's role. */
  const availableRoles =
    actorRole === "SITE_COORDINATOR"
      ? ["CAREGIVER", "CLINICAL_REVIEWER"]
      : ["CAREGIVER", "CLINICAL_REVIEWER", "SITE_COORDINATOR", "SYSADMIN"];

  /** @description Reset to a fresh form to invite another user. */
  function handleInviteAnother() {
    setFormKey((k) => k + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {signupUrl ? "Invitation created" : "Invite User"}
          </DialogTitle>
        </DialogHeader>

        {signupUrl ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Share this signup link</Label>
              <CopyableLink url={signupUrl} />
              <p className="text-sm text-muted-foreground">
                Expires in 5 days.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleInviteAnother}
              >
                Invite another
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role">
                    {(value: string | null) =>
                      value ? roleLabels[value] : "Select a role"}
                  </SelectValue>
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a site">
                    {(value: string | null) =>
                      siteOptions.find((s) => s.id === value)?.name ??
                      "Select a site"}
                  </SelectValue>
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
                Get Invite Link
              </Button>
            </DialogFooter>
          </fetcher.Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
