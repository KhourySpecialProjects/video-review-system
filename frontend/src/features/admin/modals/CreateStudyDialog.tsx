import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateStudyForm } from "./CreateStudyForm";

/**
 * @description Dialog shell for creating a study. The form body lives in
 * CreateStudyForm, mounted inside DialogContent so its selection state
 * resets when the dialog closes and the popup unmounts.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Handler for open state changes.
 */
export function CreateStudyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Study</DialogTitle>
        </DialogHeader>
        <CreateStudyForm onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
