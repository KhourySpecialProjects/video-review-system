import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudySelect } from "./StudySelect";
import type { StudyOption } from "./types";

const grouped = {
    ongoing: [{ name: "Cognition Study", status: "ongoing" }] as StudyOption[],
    completed: [{ name: "Legacy Study", status: "completed" }] as StudyOption[],
};

const empty = { ongoing: [] as StudyOption[], completed: [] as StudyOption[] };

describe("StudySelect", () => {
    it("shows the placeholder when no study is selected", () => {
        render(<StudySelect value={null} groupedStudies={empty} onChange={vi.fn()} />);
        expect(screen.getByText("All studies")).toBeInTheDocument();
    });

    it("shows the selected study on the trigger", () => {
        render(
            <StudySelect value="Cognition Study" groupedStudies={grouped} onChange={vi.fn()} />,
        );
        expect(screen.getByText("Cognition Study")).toBeInTheDocument();
    });

    it("lists ongoing and completed studies under their group labels", async () => {
        const user = userEvent.setup();
        render(<StudySelect value={null} groupedStudies={grouped} onChange={vi.fn()} />);

        await user.click(screen.getByRole("combobox"));

        expect(await screen.findByText("Ongoing")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Cognition Study" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Legacy Study" })).toBeInTheDocument();
    });

    it("hides a group that has no studies", async () => {
        const user = userEvent.setup();
        render(
            <StudySelect
                value={null}
                groupedStudies={{ ongoing: grouped.ongoing, completed: [] }}
                onChange={vi.fn()}
            />,
        );

        await user.click(screen.getByRole("combobox"));

        expect(await screen.findByText("Ongoing")).toBeInTheDocument();
        expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it("fires onChange with the chosen study name", async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<StudySelect value={null} groupedStudies={grouped} onChange={onChange} />);

        await user.click(screen.getByRole("combobox"));
        await user.click(await screen.findByRole("option", { name: "Cognition Study" }));

        expect(onChange.mock.calls[0][0]).toBe("Cognition Study");
    });
});
