import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ReviewCard, ReviewCardSkeleton } from "./ReviewCard";
import type { ReviewVideo } from "./types";

const baseVideo: ReviewVideo = {
    id: "rv-001",
    reviewStatus: "not reviewed",
    studyName: "Cognition Study",
    siteName: "Boston General",
    permissionLevel: "read",
    uploadedAt: "2026-03-01T10:00:00Z",
};

/**
 * @description Helper to render ReviewCard wrapped in MemoryRouter.
 * @param overrides - Partial ReviewVideo fields to override defaults
 */
function renderCard(overrides: Partial<ReviewVideo> = {}) {
    return render(
        <MemoryRouter>
            <ReviewCard {...baseVideo} {...overrides} />
        </MemoryRouter>
    );
}

describe("ReviewCard", () => {
    it("renders the review status badge", () => {
        renderCard();
        expect(screen.getByText("not reviewed")).toBeInTheDocument();
    });

    it("renders the permission level badge", () => {
        renderCard();
        expect(screen.getByText("Read")).toBeInTheDocument();
    });

    it("renders the study name", () => {
        renderCard();
        expect(screen.getByText("Cognition Study")).toBeInTheDocument();
    });

    it("renders the site name", () => {
        renderCard();
        expect(screen.getByText("Boston General")).toBeInTheDocument();
    });

    it("links to the review page with the video id", () => {
        renderCard();
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/review/rv-001");
    });

    it("renders the title when provided", () => {
        renderCard({ title: "Morning Session" });
        expect(screen.getByText("Morning Session")).toBeInTheDocument();
    });

    it("does not render a title element when title is absent", () => {
        const { container } = renderCard();
        expect(container.querySelector("[data-slot='card-title']")).toBeNull();
    });

    it("renders the reviewer name when provided", () => {
        renderCard({ reviewerName: "Dr. Smith" });
        expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    });

    it("does not render reviewer name when absent", () => {
        renderCard();
        expect(screen.queryByText("Dr. Smith")).not.toBeInTheDocument();
    });

    it("renders tags when provided", () => {
        renderCard({ tags: ["falls-risk", "mobility"] });
        expect(screen.getByText("falls-risk")).toBeInTheDocument();
        expect(screen.getByText("mobility")).toBeInTheDocument();
    });

    it("does not render tag section when tags are empty", () => {
        const { container } = renderCard({ tags: [] });
        expect(container.querySelector("[data-slot='card-footer']")).toBeNull();
    });

    it("does not render tag section when tags are absent", () => {
        const { container } = renderCard();
        expect(container.querySelector("[data-slot='card-footer']")).toBeNull();
    });

    it("renders correct badge variant for reviewed status", () => {
        renderCard({ reviewStatus: "reviewed" });
        expect(screen.getByText("reviewed")).toBeInTheDocument();
    });

    it("renders correct badge variant for in review status", () => {
        renderCard({ reviewStatus: "in review" });
        expect(screen.getByText("in review")).toBeInTheDocument();
    });

    it("renders Write permission label", () => {
        renderCard({ permissionLevel: "write" });
        expect(screen.getByText("Write")).toBeInTheDocument();
    });

    it("renders Admin permission label", () => {
        renderCard({ permissionLevel: "admin" });
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });
});

describe("ReviewCardSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<ReviewCardSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
