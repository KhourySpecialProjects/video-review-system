import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteSelect } from "./SiteSelect";
import type { SiteOption } from "./types";

const sites: SiteOption[] = [{ name: "Boston General" }, { name: "Seattle Clinic" }];

describe("SiteSelect", () => {
    it("shows the placeholder when no site is selected", () => {
        render(<SiteSelect value={null} sites={sites} onChange={vi.fn()} />);
        expect(screen.getByText("All sites")).toBeInTheDocument();
    });

    it("shows the selected site on the trigger", () => {
        render(<SiteSelect value="Boston General" sites={sites} onChange={vi.fn()} />);
        expect(screen.getByText("Boston General")).toBeInTheDocument();
    });

    it("offers every site plus an All option when opened", async () => {
        const user = userEvent.setup();
        render(<SiteSelect value={null} sites={sites} onChange={vi.fn()} />);

        await user.click(screen.getByRole("combobox"));

        expect(await screen.findByRole("option", { name: "All sites" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Boston General" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Seattle Clinic" })).toBeInTheDocument();
    });

    it("fires onChange with the chosen site name", async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<SiteSelect value={null} sites={sites} onChange={onChange} />);

        await user.click(screen.getByRole("combobox"));
        await user.click(await screen.findByRole("option", { name: "Seattle Clinic" }));

        expect(onChange.mock.calls[0][0]).toBe("Seattle Clinic");
    });
});
