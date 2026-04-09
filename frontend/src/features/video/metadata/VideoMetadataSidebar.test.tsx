import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
    VideoMetadataSidebar,
    type VideoMetadata,
} from "./VideoMetadataSidebar";

const mockMetadata: VideoMetadata = {
    patientId: "PT-2024-1547",
    duration: 272,
    recordedAt: new Date("2026-03-08T10:30:00"),
};

function renderWithSidebar(metadata: VideoMetadata) {
    return render(
        <SidebarProvider>
            <VideoMetadataSidebar metadata={metadata} />
        </SidebarProvider>
    );
}

describe("VideoMetadataSidebar", () => {
    it("renders patient ID", () => {
        renderWithSidebar(mockMetadata);
        expect(screen.getByText("PT-2024-1547")).toBeInTheDocument();
    });

    it("renders formatted video duration", () => {
        renderWithSidebar(mockMetadata);
        expect(screen.getByText("4:32")).toBeInTheDocument();
    });

    it("renders the recorded date", () => {
        renderWithSidebar(mockMetadata);
        expect(screen.getByText(/march 8, 2026/i)).toBeInTheDocument();
    });

    it("renders the Patient Metadata heading", () => {
        renderWithSidebar(mockMetadata);
        expect(screen.getByText(/patient metadata/i)).toBeInTheDocument();
    });

    it("renders duration correctly for sub-hour videos", () => {
        const metadata: VideoMetadata = {
            patientId: "PT-001",
            duration: 90,
            recordedAt: new Date("2026-01-01"),
        };
        renderWithSidebar(metadata);
        expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("renders duration correctly for hour-long videos", () => {
        const metadata: VideoMetadata = {
            patientId: "PT-001",
            duration: 3661,
            recordedAt: new Date("2026-01-01"),
        };
        renderWithSidebar(metadata);
        expect(screen.getByText("1:01:01")).toBeInTheDocument();
    });
});
