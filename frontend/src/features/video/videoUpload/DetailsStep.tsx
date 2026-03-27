import { useFetcher } from "react-router"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface DetailsStepProps {
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  fetcher: ReturnType<typeof useFetcher>
}

export function DetailsStep({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  fetcher
}: DetailsStepProps) {
  const actionData = fetcher.data as { fieldErrors?: Record<string, string> } | undefined;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel aria-required className="text-lg">
          Title <span className="text-danger text-lg">*</span>
        </FieldLabel>
        <FieldDescription>
          Provide a descriptive title for your video.
        </FieldDescription>
        <Input
          name="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter video title"
          required
        />
        {actionData?.fieldErrors?.title && (
          <p className="text-xs text-destructive">{actionData.fieldErrors.title}</p>
        )}
      </Field>

      <Field>
        <FieldLabel>Description</FieldLabel>
        <FieldDescription>
          Add a description to help remember what the video is about.
        </FieldDescription>
        <Input
          name="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter video description"
        />
        {actionData?.fieldErrors?.description && (
          <p className="text-xs text-destructive">{actionData.fieldErrors.description}</p>
        )}
      </Field>
    </FieldGroup>
  )
}