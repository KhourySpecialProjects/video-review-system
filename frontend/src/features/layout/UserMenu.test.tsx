import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";

const authState: { user: { name: string; role?: string } | null } = { user: null };
const toggleTheme = vi.fn();
const logout = vi.fn();

vi.mock("@/context/auth-context", () => ({
    useAuth: () => ({ user: authState.user, isLoading: false }),
}));
vi.mock("@/hooks/use-theme", () => ({
    useTheme: () => ({ theme: "light", toggleTheme, setTheme: vi.fn() }),
}));
vi.mock("@/hooks/use-logout", () => ({
    useLogout: () => logout,
}));

import { UserMenu } from "./UserMenu";

function renderUserMenu() {
    const router = createMemoryRouter([{ path: "/", element: <UserMenu /> }]);
    return render(<RouterProvider router={router} />);
}

describe("UserMenu", () => {
    beforeEach(() => {
        authState.user = null;
        toggleTheme.mockClear();
        logout.mockClear();
    });

    it("renders nothing when logged out", () => {
        const { container } = renderUserMenu();
        expect(container).toBeEmptyDOMElement();
    });

    it("shows the user's name on the trigger", () => {
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("shows the role label, Tutorial, theme toggle and logout when opened", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "CLINICAL_REVIEWER" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Clinical Reviewer")).toBeInTheDocument();
        expect(screen.getByText("Tutorial")).toBeInTheDocument();
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
        expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("invokes logout when Log out is chosen", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        await user.click(await screen.findByText("Log out"));
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it("toggles theme without closing the menu", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        await user.click(await screen.findByText("Switch to dark mode"));
        expect(toggleTheme).toHaveBeenCalledTimes(1);
        // Menu stayed open (closeOnClick={false}): item still present.
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
    });

    it("includes Reviews and Admin items for a sysadmin", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("omits Reviews and Admin items for a caregiver", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Tutorial")).toBeInTheDocument();
        expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });
});
