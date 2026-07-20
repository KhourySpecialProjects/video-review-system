import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ChangelogPage } from "./ChangelogPage";
import { changelog } from "./changelog";

function renderChangelog() {
    const router = createMemoryRouter(
        [
            { path: "/changelog", element: <ChangelogPage /> },
            { path: "/about", element: <div>About Page</div> },
        ],
        { initialEntries: ["/changelog"] },
    );
    return render(<RouterProvider router={router} />);
}

describe("ChangelogPage", () => {
    it("renders the What's new heading", () => {
        renderChangelog();
        expect(
            screen.getByRole("heading", { level: 1, name: /what's new/i }),
        ).toBeInTheDocument();
    });

    it("renders every highlight from the changelog data", () => {
        renderChangelog();
        for (const entry of changelog) {
            for (const highlight of entry.highlights) {
                expect(screen.getByText(highlight)).toBeInTheDocument();
            }
        }
    });

    it("renders one dated heading per entry", () => {
        renderChangelog();
        expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(
            changelog.length,
        );
    });

    it("formats dates in UTC so there is no timezone off-by-one", () => {
        renderChangelog();
        // The 2026-07-20 entry must read July 20 regardless of the test runner's TZ.
        expect(screen.getByText("July 20, 2026")).toBeInTheDocument();
    });

    it("shows a version pill for tagged entries", () => {
        renderChangelog();
        for (const entry of changelog.filter((e) => e.version)) {
            expect(screen.getAllByText(`v${entry.version}`).length).toBeGreaterThan(0);
        }
    });

    it("links back to the About page", () => {
        renderChangelog();
        expect(
            screen.getByRole("link", { name: /back to about/i }),
        ).toHaveAttribute("href", "/about");
    });
});
