import { useState, useEffect } from "react"
import { useFetcher } from "react-router"
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
  AlertDialogAction
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Download, CircleCheckBig, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { convert } from "../downscaler/convert"
import { SelectStep } from "./SelectStep"
import { DetailsStep } from "./DetailsStep"
import { CompletedStep } from "./CompletedStep"

type UploadStep = "select" | "details" | "complete"

const titles: Record<UploadStep, string> = {
  select: "Upload Video",
  details: "Add Details",
  complete: "",
}

export function VideoUpload() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<UploadStep>("select")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const fetcher = useFetcher()

  const handleClose = () => {
    setOpen(false)
    setStep("select")
    setTitle("")
    setDescription("")
    setConfirmationOpen(false)
  }

  // Handle successful form submission
  useEffect(() => {
    if (fetcher.data && (fetcher.data as any).success && fetcher.state === "idle" && step === "details") {
      setStep("complete")
    }
  }, [fetcher.data, fetcher.state, step])

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (open) {
        setOpen(open)
      } else {
        setConfirmationOpen(true)
      }
    }}>
      <DialogTrigger render={
        <Button className="fixed bottom-4 left-4 right-4 z-50 md:static md:bottom-auto md:left-auto md:right-auto md:z-auto w-auto md:w-1/2 bg-primary text-bg-dark" variant="outline">
          <Download className="size-5 text-bg-dark text-2xl font-bold" /> Upload Video
        </Button>
      } />
      <DialogContent className="sm:max-w-md shadow-l">
        <DialogHeader>
          <DialogTitle className="text-2xl">{titles[step]}</DialogTitle>
          {
            step === "details" && (
              <>
                <Badge variant="outline" className="my-3 py-4 px-2 text-md font-bold gap-3 text-success bg bg-success/20 outline-2 outline-success [&>svg]:size-5">
                  <CircleCheckBig className="text-text" />
                  Video Uploaded
                </Badge>
                <Separator className="mt-2" />
              </>
            )
          }
        </DialogHeader>

        {step === "select" && (
          <SelectStep
            downscaleVideo={(file, onProgress) =>
              convert(file, { onProgress })
            }
            onVideoSelected={() => {
              setStep("details")
            }}
          />
        )}

        {step === "details" && (
          <fetcher.Form method="post" action="/" className="space-y-4">
            <DetailsStep
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              fetcher={fetcher}
            />
            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={fetcher.state !== "idle" || !title.trim()}
              >
                {fetcher.state !== "idle" ? "Saving..." : "Continue"}
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </fetcher.Form>
        )}

        {step === "complete" && (
          <>
            <CompletedStep />
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  handleClose()
                  toast.success("Video uploaded successfully", {
                    description: "You have 10 minutes to undo the video upload in case you uploaded the wrong video",
                    action: {
                      label: "Undo",
                      onClick: () => {
                        console.log("Video has been deleted")
                        toast.dismiss()
                      }
                    }
                  })
                }} >Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will close the video upload dialog and you will lose all progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
