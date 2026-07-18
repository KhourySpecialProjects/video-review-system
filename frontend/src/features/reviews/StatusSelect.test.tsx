import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusSelect } from "./StatusSelect";

describe("StatusSelect", () => {
    it("shows the placeholder when no status is selected", () => {
        render(<StatusSelect value={null} onChange={vi.fn()} />);
        expect(screen.getByText("All statuses")).toBeInTheDocument();
    });

    it("shows the selected status on the trigger", () => {
        render(<StatusSelect value="in review" onChange={vi.fn()} />);
        expect(screen.getByText("in review")).toBeInTheDocument();
    });

    it("offers every status plus an All option when opened", async () => {
        const user = userEvent.setup();
        render(<StatusSelect value={null} onChange={vi.fn()} />);

        await user.click(screen.getByRole("combobox"));

        expect(await screen.findByRole("option", { name: "All statuses" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "not reviewed" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "in review" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "reviewed" })).toBeInTheDocument();
    });

    it("fires onChange with the chosen status", async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<StatusSelect value={null} onChange={onChange} />);

        await user.click(screen.getByRole("combobox"));
        await user.click(await screen.findByRole("option", { name: "reviewed" }));

        // base-ui passes an event-details object as a second arg; assert the value.
        expect(onChange.mock.calls[0][0]).toBe("reviewed");
    });
});
