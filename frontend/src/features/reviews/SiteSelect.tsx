import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SiteOption } from "./types";

type SiteSelectProps = {
    /** @param value - Currently selected site name, or null for "all" */
    value: string | null;
    /** @param sites - Available site options */
    sites: SiteOption[];
};

/**
 * @description Select dropdown for filtering reviews by site (hospital).
 * Uses the base-ui Select `name` prop for form serialization.
 * Submission is handled by the parent Form's onChange.
 */
export function SiteSelect({ value, sites }: SiteSelectProps) {
    const items = [
        { label: "All sites", value: null },
        ...sites.map((s) => ({ label: s.name, value: s.name })),
    ];

    return (
        <Select
            name="site"
            items={items}
            value={value}
        >
            <SelectTrigger>
                <SelectValue>
                    {(selected: string | null) => selected ?? "All sites"}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} side="bottom">
                <SelectGroup>
                    <SelectItem value={null}>All sites</SelectItem>
                    {sites.map((site) => (
                        <SelectItem key={site.name} value={site.name}>
                            {site.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
