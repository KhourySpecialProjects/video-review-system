import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

/**
 * Light/dark theme toggle button. Wraps `useTheme` so it can be dropped into
 * both authenticated (Navbar) and unauthenticated (login, forgot/reset
 * password) pages without any prop wiring.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            className={"text-text" + (className ? " " + className : "")}
            onClick={toggleTheme}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
    );
}
