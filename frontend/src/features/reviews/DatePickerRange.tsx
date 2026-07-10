import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerRangeProps = {
    /** @param date - The currently selected date range */
    date: DateRange | undefined;
    /** @param onSelect - Callback when the date range changes */
    onSelect: (range: DateRange | undefined) => void;
};

/**
 * @description A popover-based date range picker.
 * Renders a trigger button showing the current selection that opens
 * a two-month calendar for selecting a start and end date.
 * @param {DatePickerRangeProps} props - The component props
 */
export function DatePickerRange({ date, onSelect }: DatePickerRangeProps) {
    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        className="justify-start px-2.5 font-normal"
                    >
                        <CalendarIcon data-icon="inline-start" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                }
            />
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={onSelect}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    );
}
