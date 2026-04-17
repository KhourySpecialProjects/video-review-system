import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { UserStudyOption } from "@shared/study"

type DetailsStepProps = {
  title: string
  description: string
  studyId: string | null
  studies: UserStudyOption[]
  studiesLoading: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStudyIdChange: (value: string) => void
}

/**
 * @description Form fields for title, description, and study selection on
 * the details step of the upload dialog. The study field defaults to the
 * site's "Miscellaneous" study (resolved by the caller).
 * @param props - Field values, study options, and change handlers
 */
export function DetailsStep({
  title,
  description,
  studyId,
  studies,
  studiesLoading,
  onTitleChange,
  onDescriptionChange,
  onStudyIdChange,
}: DetailsStepProps) {
  const selectedStudy = studies.find((s) => s.id === studyId)

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

      <Field>
        <FieldLabel>Study</FieldLabel>
        <FieldDescription>
          Assign the video to one of your studies. Defaults to Miscellaneous.
        </FieldDescription>
        <Select
          name="studyId"
          items={studies.map((s) => ({ label: s.name, value: s.id }))}
          value={studyId}
          onValueChange={(value) => {
            if (typeof value === "string") onStudyIdChange(value)
          }}
          disabled={studiesLoading || studies.length === 0}
        >
          <SelectTrigger>
            <SelectValue>
              {() =>
                studiesLoading ? (
                  <Spinner />
                ) : (
                  (selectedStudy?.name ?? "Select a study")
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} side="bottom">
            <SelectGroup>
              {studies.map((study) => (
                <SelectItem key={study.id} value={study.id}>
                  {study.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  )
}
