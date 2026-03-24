import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "video-portal-theme";

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const body = document.body;
        if (theme === "light") {
            body.classList.add("light");
        } else {
            body.classList.remove("light");
        }
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
    }, []);

    return { theme, toggleTheme, setTheme } as const;
}
