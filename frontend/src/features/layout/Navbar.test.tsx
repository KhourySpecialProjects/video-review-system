import { useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";

/**
 * @description Mutable auth state consumed by the mocked useAuth below.
 * Tests set `authState.user` before rendering; beforeEach resets it.
 */
const authState: { user: { name: string; role?: string } | null } = { user: null };

vi.mock("@/context/auth-context", () => ({
    useAuth: () => ({ user: authState.user, isLoading: false }),
}));

import { Navbar } from "./Navbar";

/**
 * @description Wrapper that owns the scroll container ref and passes it to the
 * Navbar. The Navbar's `useScroll` asserts the container ref is hydrated on
 * mount, so the ref must point at a real element rendered alongside the Navbar.
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

    it("shows the logged-in user's name in the header", () => {
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("exposes Tutorial, theme toggle and logout in the user menu", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderNavbar();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Tutorial")).toBeInTheDocument();
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
        expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("shows top-level Reviews and Admin links for a sysadmin", () => {
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows top-level Reviews and Admin links for a site coordinator", () => {
        authState.user = { name: "Coco Ord", role: "SITE_COORDINATOR" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows Reviews but not Admin for a clinical reviewer", () => {
        authState.user = { name: "Rey View", role: "CLINICAL_REVIEWER" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("hides Reviews and Admin for caregivers", () => {
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderNavbar();
        expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("logo links to /reviews for a non-caregiver", () => {
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByLabelText("Home")).toHaveAttribute("href", "/reviews");
    });

    it("logo links to / for a caregiver", () => {
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderNavbar();
        expect(screen.getByLabelText("Home")).toHaveAttribute("href", "/");
    });
});
