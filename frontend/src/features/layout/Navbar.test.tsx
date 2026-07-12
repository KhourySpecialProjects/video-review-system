import { useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";

/**
 * @description Mutable auth state consumed by the mocked useAuth below.
 * Tests set `authState.user` before rendering to simulate different roles;
 * beforeEach resets it to a logged-out state.
 */
const authState: { user: { role?: string } | null } = { user: null };

vi.mock("@/context/auth-context", () => ({
    useAuth: () => ({ user: authState.user, isLoading: false }),
}));

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
 * @description Renders the Navbar inside a memory data router. The auth
 * context is mocked (see `authState` above); the `/incomplete-uploads`
 * stub route serves the fetch that `useIncompleteUploads` fires for
 * caregiver sessions.
 */
function renderNavbar() {
    const router = createMemoryRouter([
        { path: "/", element: <ScrollShell /> },
        { path: "/incomplete-uploads", loader: () => ({ uploads: [] }) },
    ]);
    return render(<RouterProvider router={router} />);
}

describe("Navbar", () => {
    beforeEach(() => {
        authState.user = null;
    });

    it("renders the logo", () => {
        renderNavbar();
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("Asclepion")).toBeInTheDocument();
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

    it("shows Reviews and Admin links for a sysadmin", () => {
        authState.user = { role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows Reviews and Admin links for a site coordinator", () => {
        authState.user = { role: "SITE_COORDINATOR" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows Reviews but not Admin for a clinical reviewer", () => {
        authState.user = { role: "CLINICAL_REVIEWER" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("hides Reviews and Admin for caregivers", () => {
        authState.user = { role: "CAREGIVER" };
        renderNavbar();
        expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });
});
