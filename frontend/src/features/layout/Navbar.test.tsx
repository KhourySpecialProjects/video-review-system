import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Navbar } from "./Navbar";

/**
 * @description Renders the Navbar inside a memory data router. The Navbar's
 * `useIncompleteUploads` hook kicks off a fetcher.load for
 * `/incomplete-uploads`, so that route must exist in the router config;
 * a stub loader returning `{ uploads: [] }` keeps it quiet.
 */
function renderNavbar() {
    const router = createMemoryRouter([
        { path: "/", element: <Navbar /> },
        { path: "/incomplete-uploads", loader: () => ({ uploads: [] }) },
    ]);
    return render(<RouterProvider router={router} />);
}

describe("Navbar", () => {
    it("renders the logo", () => {
        renderNavbar();
        expect(screen.getByText("CV")).toBeInTheDocument();
    });

    it("renders desktop nav links", () => {
        renderNavbar();
        expect(screen.getByText("Tutorial")).toBeInTheDocument();
    });

    it("has a theme toggle button", () => {
        renderNavbar();
        const toggleButtons = screen.getAllByLabelText("Toggle theme");
        expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it("toggles the mobile menu when hamburger is clicked", () => {
        renderNavbar();
        const menuButton = screen.getByLabelText("Toggle menu");
        fireEvent.click(menuButton);

        expect(screen.getByText("Log out")).toBeInTheDocument();
    });
});
