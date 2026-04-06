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
};

/**
 * @description Select dropdown for filtering reviews by study.
 * Displays studies in two groups: Ongoing and Completed.
 * Uses the base-ui Select `name` prop for form serialization.
 * Submission is handled by the parent Form's onChange.
 */
export function StudySelect({ value, groupedStudies }: StudySelectProps) {
    const items = [
        { label: "All studies", value: null },
        ...groupedStudies.ongoing.map((s) => ({ label: s.name, value: s.name })),
        ...groupedStudies.completed.map((s) => ({ label: s.name, value: s.name })),
    ];

    return (
        <Select
            name="study"
            items={items}
            value={value}
        >
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
