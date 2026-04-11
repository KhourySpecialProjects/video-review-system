
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

/**
 * Metadata about a video and its associated patient.
 * Used to populate the VideoMetadataSidebar.
 */
export interface VideoMetadata {
    /** Unique patient ID linked to the caregiver account. */
    patientId: string;
    /** Duration of the video in seconds. */
    duration: number;
    /** Date and time when the video was recorded. */
    recordedAt: Date;
}

/**
 * Props for the VideoMetadataSidebar component.
 */
interface VideoMetadataSidebarProps {
    metadata: VideoMetadata;
}

/**
 * Formats a duration in seconds to HH:MM:SS format.
 *
 * @param seconds - The duration in seconds.
 * @returns A formatted string in HH:MM:SS format.
 */
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Formats a Date object to a readable string.
 *
 * @param date - The date to format.
 * @returns A formatted date/time string.
 */
function formatDate(date: Date): string {
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * VideoMetadataSidebar displays general metadata about a video
 * and its associated patient in a collapsible left sidebar panel.
 *
 * Shows patient ID, video duration, and the date/time the video was recorded.
 * Collapse state is managed by the enclosing SidebarProvider.
 */
export function VideoMetadataSidebar({ metadata }: VideoMetadataSidebarProps) {
    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Patient Metadata
                </p>
            </SidebarHeader>

            <SidebarContent className="flex flex-col gap-4 overflow-y-auto p-4">
                <Separator />

                {/* Patient ID */}
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                        Patient ID
                    </p>
                    <p className="text-sm font-semibold text-text">
                        {metadata.patientId}
                    </p>
                </div>

                <Separator />

                {/* Video Duration */}
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                        Duration
                    </p>
                    <p className="text-sm font-semibold text-text">
                        {formatDuration(metadata.duration)}
                    </p>
                </div>

                <Separator />

                {/* Recorded At */}
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                        Recorded
                    </p>
                    <p className="text-sm font-semibold text-text">
                        {formatDate(metadata.recordedAt)}
                    </p>
                </div>
            </SidebarContent>

            <SidebarRail />
        </Sidebar>
    );
}
