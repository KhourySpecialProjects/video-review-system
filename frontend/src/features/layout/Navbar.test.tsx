import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
    it("renders the logo", () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );
        expect(screen.getByText("CV")).toBeInTheDocument();
    });

    it("renders desktop nav links", () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );
        expect(screen.getByText("Tutorial")).toBeInTheDocument();
        expect(screen.getByText("Need Help?")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("has a theme toggle button", () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );
        const toggleButtons = screen.getAllByLabelText("Toggle theme");
        expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it("toggles the mobile menu when hamburger is clicked", () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        );
        const menuButton = screen.getByLabelText("Toggle menu");
        fireEvent.click(menuButton);

        expect(screen.getByText("Log out")).toBeInTheDocument();
    });
});
