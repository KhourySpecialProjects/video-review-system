import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Landing } from "./Landing";

function renderLanding() {
    const router = createMemoryRouter([
        { path: "/", element: <Landing /> },
        { path: "/login", element: <div>Login Page</div> },
        { path: "/about", element: <div>About Page</div> },
    ]);
    return render(<RouterProvider router={router} />);
}

describe("Landing", () => {
    it("renders the Asclepion wordmark", () => {
        renderLanding();
        expect(screen.getByRole("heading", { name: "Asclepion" })).toBeInTheDocument();
    });

    it("renders the mission tagline", () => {
        renderLanding();
        expect(
            screen.getByText(/advance angelman syndrome research together/i)
        ).toBeInTheDocument();
    });

    it("renders a Log in call to action linking to /login", () => {
        renderLanding();
        const cta = screen.getByRole("link", { name: /log in/i });
        expect(cta).toHaveAttribute("href", "/login");
    });

    it("renders the theme toggle", () => {
        renderLanding();
        expect(
            screen.getByRole("button", { name: /toggle theme/i })
        ).toBeInTheDocument();
    });

    it("renders an About Asclepion link to /about", () => {
        renderLanding();
        expect(
            screen.getByRole("link", { name: /about asclepion/i })
        ).toHaveAttribute("href", "/about");
    });
});
