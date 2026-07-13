import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IncompleteUpload } from "@shared-types/video";

// Isolate the indicator from UploadCard's heavier dependency tree.
vi.mock("./UploadCard", () => ({
    UploadCard: ({ upload }: { upload: IncompleteUpload }) => (
        <div data-testid="upload-card">{upload.fileName}</div>
    ),
}));

import { DesktopUploadIndicator } from "./DesktopUploadIndicator";

const uploads: IncompleteUpload[] = [
    {
        videoId: "v1",
        fileName: "clip-one.mp4",
        fileSize: 1000,
        bytesUploaded: 500,
        totalParts: 2,
        uploadedPartCount: 1,
        createdAt: "2026-07-13T00:00:00.000Z",
    },
];

const noop = () => {};

describe("DesktopUploadIndicator", () => {
    it("renders nothing when there are no uploads", () => {
        const { container } = render(
            <DesktopUploadIndicator uploads={[]} busy={false} onResume={noop} onCancel={noop} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows a count trigger and reveals cards on click", async () => {
        const user = userEvent.setup();
        render(
            <DesktopUploadIndicator uploads={uploads} busy={false} onResume={noop} onCancel={noop} />,
        );
        // Cards are not visible until the popover is opened.
        expect(screen.queryByTestId("upload-card")).not.toBeInTheDocument();
        await user.click(screen.getByLabelText("Incomplete uploads (1)"));
        expect(await screen.findByText("clip-one.mp4")).toBeInTheDocument();
    });
});
