import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AboutPage } from "./AboutPage";

function renderAbout() {
    const router = createMemoryRouter(
        [
            { path: "/about", element: <AboutPage /> },
            { path: "/", element: <div>Home</div> },
            { path: "/changelog", element: <div>Changelog Page</div> },
        ],
        { initialEntries: ["/about"] },
    );
    return render(<RouterProvider router={router} />);
}

describe("AboutPage", () => {
    it("renders the About Asclepion heading", () => {
        renderAbout();
        expect(
            screen.getByRole("heading", { name: /about asclepion/i }),
        ).toBeInTheDocument();
    });

    it("describes what the portal is", () => {
        renderAbout();
        expect(
            screen.getByText(/secure video management portal for angelman syndrome/i),
        ).toBeInTheDocument();
    });

    it("links to the changelog via the What's new action", () => {
        renderAbout();
        expect(screen.getByRole("link", { name: /what's new/i })).toHaveAttribute(
            "href",
            "/changelog",
        );
    });

    it("renders a Back link to home", () => {
        renderAbout();
        expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/");
    });

    it("renders the theme toggle", () => {
        renderAbout();
        expect(
            screen.getByRole("button", { name: /toggle theme/i }),
        ).toBeInTheDocument();
    });
});
