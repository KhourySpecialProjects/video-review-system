import { useRef, useCallback, useEffect } from "react";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 300;

type SearchInputProps = {
    /** @param value - Current search value from URL filters */
    value: string;
    /** @param onChange - Callback invoked with the debounced search value */
    onChange: (value: string) => void;
};

/**
 * @description Search input for filtering reviews by video title.
 * Debounces keystrokes before invoking `onChange` so that each character
 * typed does not trigger a separate loader request. Stays in sync with the
 * external `value` prop (e.g. when filters are cleared via navigation).
 */
export function SearchInput({ value, onChange }: SearchInputProps) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Mirror external value changes (e.g. "Clear all filters" or back/forward
    // navigation) into the uncontrolled input without disturbing the user
    // while they are actively typing.
    useEffect(() => {
        if (inputRef.current && inputRef.current.value !== value) {
            inputRef.current.value = value;
        }
    }, [value]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const next = event.currentTarget.value;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onChange(next);
        }, DEBOUNCE_MS);
    }, [onChange]);

    return (
        <InputGroup className="lg:max-w-xs">
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                ref={inputRef}
                name="search"
                placeholder="Search by title..."
                defaultValue={value}
                onChange={handleChange}
            />
        </InputGroup>
    );
}
