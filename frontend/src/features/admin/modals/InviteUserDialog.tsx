import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * @description Placeholder dialog shown from the admin sidebar's
 * "Invite User" action while the invite flow is unavailable on this
 * deployment. Explains that invites are coming soon; it has no form and
 * sends nothing.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="size-6 text-primary" />
          </div>
          <DialogTitle>User invites coming soon!</DialogTitle>
          <DialogDescription>
            We're putting the finishing touches on inviting new users. Thanks
            for your patience. In the meantime, please contact the Asclepion
            team and we'll be happy to set up an account for you.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
