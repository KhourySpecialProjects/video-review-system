import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
    it("renders both tab labels", () => {
        render(
            <TabBar activeTab="recent" onTabChange={() => { }} totalVideos={5} />
        );
        expect(screen.getByText("Recent Uploads")).toBeInTheDocument();
        expect(screen.getByText("All Videos (5)")).toBeInTheDocument();
    });

    it("calls onTabChange when a tab is clicked", () => {
        const onTabChange = vi.fn();
        render(
            <TabBar activeTab="recent" onTabChange={onTabChange} totalVideos={5} />
        );
        fireEvent.click(screen.getByText("All Videos (5)"));
        expect(onTabChange).toHaveBeenCalledWith("all");
    });

    it("displays the correct total videos count", () => {
        render(
            <TabBar activeTab="recent" onTabChange={() => { }} totalVideos={12} />
        );
        expect(screen.getByText("All Videos (12)")).toBeInTheDocument();
    });
});
