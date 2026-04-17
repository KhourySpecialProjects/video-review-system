import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Download, CircleCheckBig, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SelectStep } from "./SelectStep"
import { DetailsStep } from "./DetailsStep"
import { CompletedStep } from "./CompletedStep"
import { useVideoUpload, type UploadStep } from "./useVideoUpload"

const titles: Record<UploadStep, string> = {
  details: "Add Details",
  select: "Upload Video",
  complete: "",
}

/**
 * Multi-step video upload dialog.
 * Flow: details → select file & upload → complete.
 */
export function VideoUpload() {
  const { state, dispatch, handleFileSelected, handlePause } = useVideoUpload()
  const { open, confirmationOpen, step, title, description, upload } = state

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        dispatch({ type: nextOpen ? "OPEN" : "REQUEST_CLOSE" })
      }
    >
      <DialogTrigger
        render={
          <Button
            className="fixed bottom-4 left-4 right-4 z-50 md:static md:bottom-auto md:left-auto md:right-auto md:z-auto w-auto md:w-1/2 bg-primary text-bg-dark"
            variant="outline"
          >
            <Download className="size-5 text-bg-dark text-2xl font-bold" />{" "}
            Upload Video
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md shadow-l">
        <DialogHeader>
          <DialogTitle className="text-2xl">{titles[step]}</DialogTitle>
          {step === "select" && (
            <>
              <Badge
                variant="outline"
                className="my-3 py-4 px-2 text-md font-bold gap-3 text-success bg bg-success/20 outline-2 outline-success [&>svg]:size-5"
              >
                <CircleCheckBig className="text-text" />
                Details Added
              </Badge>
              <Separator className="mt-2" />
            </>
          )}
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <DetailsStep
              title={title}
              description={description}
              onTitleChange={(v) => dispatch({ type: "SET_TITLE", title: v })}
              onDescriptionChange={(v) =>
                dispatch({ type: "SET_DESCRIPTION", description: v })
              }
            />
            <DialogFooter>
              <Button
                className="w-full"
                disabled={!title.trim()}
                onClick={() => dispatch({ type: "ADVANCE_TO_SELECT" })}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "select" && (
          <SelectStep
            onFileSelected={handleFileSelected}
            upload={upload}
            onPause={handlePause}
          />
        )}

        {step === "complete" && (
          <>
            <CompletedStep />
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  dispatch({ type: "RESET" })
                  toast.success("Video uploaded successfully", {
                    description:
                      "You have 10 minutes to undo the video upload in case you uploaded the wrong video",
                    action: {
                      label: "Undo",
                      onClick: () => {
                        console.log("Video has been deleted")
                        toast.dismiss()
                      },
                    },
                  })
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(nextOpen) =>
          dispatch({ type: nextOpen ? "REQUEST_CLOSE" : "CANCEL_CLOSE" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              If an upload is in progress, your progress is saved. You can
              resume it later from the menu bar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => dispatch({ type: "RESET" })}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
