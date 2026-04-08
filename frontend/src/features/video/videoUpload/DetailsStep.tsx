import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type DetailsStepProps = {
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

/**
 * @description Form fields for the video title and description in the upload dialog.
 * @param props - Title/description values and change handlers
 */
export function DetailsStep({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: DetailsStepProps) {
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
      </Field>
    </FieldGroup>
  )
}