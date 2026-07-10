import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoVideosEmpty, NoFilterResultsEmpty } from "./ReviewEmptyStates";

describe("NoVideosEmpty", () => {
    it("renders the no videos title", () => {
        render(<NoVideosEmpty />);
        expect(screen.getByText("No videos assigned")).toBeInTheDocument();
    });

    it("renders the no videos description", () => {
        render(<NoVideosEmpty />);
        expect(
            screen.getByText(/don't have any videos assigned/)
        ).toBeInTheDocument();
    });
});

describe("NoFilterResultsEmpty", () => {
    it("renders the no results title", () => {
        render(<NoFilterResultsEmpty />);
        expect(screen.getByText("No matching videos")).toBeInTheDocument();
    });

    it("renders the no results description", () => {
        render(<NoFilterResultsEmpty />);
        expect(
            screen.getByText(/No videos match your current filters/)
        ).toBeInTheDocument();
    });
});
