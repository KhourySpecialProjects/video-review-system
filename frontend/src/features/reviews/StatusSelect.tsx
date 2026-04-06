import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ReviewStatus } from "./types";
import { REVIEW_STATUS_OPTIONS } from "./filterUtils";

type StatusSelectProps = {
    /** @param value - Currently selected status, or null for "all" */
    value: ReviewStatus | null;
};

/**
 * @description Select dropdown for filtering reviews by review status.
 * Uses the base-ui Select `name` prop for form serialization.
 * Submission is handled by the parent Form's onChange.
 */
export function StatusSelect({ value }: StatusSelectProps) {
    const items = [
        { label: "All statuses", value: null },
        ...REVIEW_STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
    ];

    return (
        <Select
            name="status"
            items={items}
            value={value}
        >
            <SelectTrigger>
                <SelectValue>
                    {(selected: string | null) => selected ?? "All statuses"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} side="bottom">
                <SelectGroup>
                    <SelectItem value={null}>All statuses</SelectItem>
                    {REVIEW_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                            {status}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
