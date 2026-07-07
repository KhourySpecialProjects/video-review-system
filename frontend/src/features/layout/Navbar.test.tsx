import { useRef } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";
import { Navbar } from "./Navbar";

/**
 * @description Wrapper that owns the scroll container ref and passes it to
 * the Navbar via `<Outlet context>` → prop forwarding. The Navbar's
 * `useScroll` asserts that the container ref is hydrated on mount, so the
 * ref must point at a real element rendered alongside the Navbar.
 */
function ScrollShell() {
    const scrollContainerRef = useRef<HTMLElement>(null);
    return (
        <>
            <Navbar scrollContainerRef={scrollContainerRef} />
            <main ref={scrollContainerRef as React.RefObject<HTMLElement>} />
            <Outlet />
        </>
    );
}

/**
 * @description Renders the Navbar inside a memory data router. The Navbar's
 * `useIncompleteUploads` hook only loads `/incomplete-uploads` for caregiver
 * sessions; these tests render without an `AuthProvider`, so the fetch never
 * fires. The stub route is kept so the config stays valid regardless.
 */
function renderNavbar() {
    const router = createMemoryRouter([
        { path: "/", element: <ScrollShell /> },
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
