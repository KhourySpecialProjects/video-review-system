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
    /** @param onChange - Fires with the new site name, or null when "All" is selected */
    onChange: (value: string | null) => void;
};

/**
 * @description Select dropdown for filtering reviews by site (hospital).
 */
export function SiteSelect({ value, sites, onChange }: SiteSelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
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
