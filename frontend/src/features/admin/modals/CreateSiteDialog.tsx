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
import { FieldError } from "@/components/ui/field";

/**
 * @description Dialog for creating a new site. Submits via fetcher.Form
 * to the /admin/create-site resource route. Validation runs in the
 * action via Zod. Only available to SYSADMIN users.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function CreateSiteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetcher = useFetcher<{ ok: boolean; fieldErrors?: Record<string, string[]> }>();
  const fieldErrors = fetcher.data?.fieldErrors;

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
          <DialogTitle>Create Site</DialogTitle>
        </DialogHeader>

        <fetcher.Form
          method="post"
          action="/admin/create-site"
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Site Name</Label>
            <Input
              id="site-name"
              name="name"
              placeholder="Boston General"
            />
            {fieldErrors?.name && (
              <FieldError>{fieldErrors.name[0]}</FieldError>
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
              Create Site
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
