import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { StudyOption } from "./types";

type StudySelectProps = {
    /** @param value - Currently selected study name, or null for "all" */
    value: string | null;
    /** @param groupedStudies - Studies split into ongoing and completed groups */
    groupedStudies: { ongoing: StudyOption[]; completed: StudyOption[] };
    /** @param onChange - Fires with the new study name, or null when "All" is selected */
    onChange: (value: string | null) => void;
};

/**
 * @description Select dropdown for filtering reviews by study.
 * Displays studies in two groups: Ongoing and Completed.
 */
export function StudySelect({ value, groupedStudies, onChange }: StudySelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue>
                    {(selected: string | null) => selected ?? "All studies"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} side="bottom">
                <SelectGroup>
                    <SelectItem value={null}>All studies</SelectItem>
                </SelectGroup>
                {groupedStudies.ongoing.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Ongoing</SelectLabel>
                        {groupedStudies.ongoing.map((study) => (
                            <SelectItem key={study.name} value={study.name}>
                                {study.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
                {groupedStudies.completed.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Completed</SelectLabel>
                        {groupedStudies.completed.map((study) => (
                            <SelectItem key={study.name} value={study.name}>
                                {study.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
}
