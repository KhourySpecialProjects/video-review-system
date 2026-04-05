import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
    VideoMetadataSidebar,
    type VideoMetadata,
} from "./VideoMetadataSidebar";

const mockMetadata: VideoMetadata = {
    patientId: "PT-2024-1547",
    duration: 272,
    recordedAt: new Date("2026-03-08T10:30:00"),
};

describe("VideoMetadataSidebar", () => {
    it("renders patient ID", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);
        expect(screen.getByText("PT-2024-1547")).toBeInTheDocument();
    });

    it("renders formatted video duration", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);
        expect(screen.getByText("4:32")).toBeInTheDocument();
    });

    it("renders the recorded date", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);
        expect(screen.getByText(/march 8, 2026/i)).toBeInTheDocument();
    });

    it("renders the Patient Metadata heading", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);
        expect(screen.getByText(/patient metadata/i)).toBeInTheDocument();
    });

    it("collapses when the collapse button is clicked", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);
        expect(screen.getByText("PT-2024-1547")).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Collapse sidebar"));

        expect(screen.queryByText("PT-2024-1547")).not.toBeInTheDocument();
    });

    it("expands again after being collapsed", () => {
        render(<VideoMetadataSidebar metadata={mockMetadata} />);

        fireEvent.click(screen.getByLabelText("Collapse sidebar"));
        expect(screen.queryByText("PT-2024-1547")).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Expand sidebar"));
        expect(screen.getByText("PT-2024-1547")).toBeInTheDocument();
    });

    it("renders duration correctly for sub-hour videos", () => {
        const metadata: VideoMetadata = {
            patientId: "PT-001",
            duration: 90,
            recordedAt: new Date("2026-01-01"),
        };
        render(<VideoMetadataSidebar metadata={metadata} />);
        expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("renders duration correctly for hour-long videos", () => {
        const metadata: VideoMetadata = {
            patientId: "PT-001",
            duration: 3661,
            recordedAt: new Date("2026-01-01"),
        };
        render(<VideoMetadataSidebar metadata={metadata} />);
        expect(screen.getByText("1:01:01")).toBeInTheDocument();
    });
});