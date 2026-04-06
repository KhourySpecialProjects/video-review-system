import { useRef, useCallback, useEffect } from "react";
import { useSubmit } from "react-router";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 300;

type SearchInputProps = {
    /** @param defaultValue - Initial value for the search field */
    defaultValue: string;
};

/**
 * @description Search input for filtering reviews by video title.
 * Debounces keystrokes before submitting the parent form so that
 * each character typed does not trigger a separate loader request.
 */
export function SearchInput({ defaultValue }: SearchInputProps) {
    const submit = useSubmit();
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    /**
     * @description Stops the event from bubbling to the form's onChange,
     * then debounces submission of the parent form.
     * @param event - The change event from the input
     */
    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const form = event.currentTarget.form;
        if (!form) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            submit(form);
        }, DEBOUNCE_MS);
    }, [submit]);

    return (
        <InputGroup className="lg:max-w-xs">
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                name="search"
                placeholder="Search by title..."
                defaultValue={defaultValue}
                onChange={handleChange}
            />
        </InputGroup>
    );
}
