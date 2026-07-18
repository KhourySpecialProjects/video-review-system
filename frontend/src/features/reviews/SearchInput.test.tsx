import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchInput } from "./SearchInput";

/**
 * @description Renders SearchInput with a spy onChange.
 * @param value - Initial external search value
 */
function setup(value = "") {
    const onChange = vi.fn();
    const utils = render(<SearchInput value={value} onChange={onChange} />);
    const input = screen.getByRole<HTMLInputElement>("textbox");
    return { onChange, input, ...utils };
}

/**
 * @description Simulates a keystroke by setting the input value and firing a
 * change event, the way a real input reports its running value.
 * @param input - The search input element
 * @param value - The input's full value after this keystroke
 */
function typeChar(input: HTMLInputElement, value: string) {
    fireEvent.change(input, { target: { value } });
}

describe("SearchInput", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("debounces keystrokes into a single onChange call", () => {
        const { onChange, input } = setup();

        // Running value after each of five keystrokes.
        typeChar(input, "f");
        typeChar(input, "fa");
        typeChar(input, "fal");
        typeChar(input, "fall");
        typeChar(input, "falls");

        // Nothing fires while the user is still within the debounce window.
        expect(onChange).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        // The five keystrokes collapse to one call with the final value.
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("falls");
    });

    it("does not fire onChange before the debounce window elapses", () => {
        const { onChange, input } = setup();

        typeChar(input, "ab");
        act(() => {
            vi.advanceTimersByTime(299);
        });

        expect(onChange).not.toHaveBeenCalled();
    });

    it("mirrors an external value change into the input", () => {
        const { input, rerender } = setup("morning");
        expect(input.value).toBe("morning");

        // e.g. the user hits "Clear all filters" and the URL resets.
        rerender(<SearchInput value="" onChange={vi.fn()} />);
        expect(input.value).toBe("");
    });

    it("does not invoke onChange after unmount", () => {
        const { onChange, input, unmount } = setup();

        typeChar(input, "x");
        unmount();
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(onChange).not.toHaveBeenCalled();
    });
});
