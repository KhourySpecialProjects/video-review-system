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
    /** @param onChange - Fires with the new status, or null when "All" is selected */
    onChange: (value: ReviewStatus | null) => void;
};

/**
 * @description Select dropdown for filtering reviews by review status.
 */
export function StatusSelect({ value, onChange }: StatusSelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
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
