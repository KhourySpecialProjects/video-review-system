import { Link } from "react-router";
import {
    Sun,
    Moon,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg-dark px-4 py-2">
            {/* Logo */}
            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    CV
                </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
                <Link to="/tutorials" className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all">
                    Tutorial
                </Link>
                <Link to="/" className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all">
                    Need Help?
                </Link>
                <Link to="/" className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all">
                    Settings
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-text"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-text-muted"
                    aria-label="Log out"
                >
                    <LogOut className="size-4" />
                </Button>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center gap-1 md:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-text"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-text"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="absolute left-0 top-full w-full border-b border-border bg-bg-dark p-4 md:hidden">
                    <div className="flex flex-col gap-2">
                        <Link
                            to="/tutorials"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text hover:bg-muted transition-all"
                        >
                            Tutorial
                        </Link>
                        <Link
                            to="/"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text hover:bg-muted transition-all"
                        >
                            Need Help?
                        </Link>
                        <Link
                            to="/"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text hover:bg-muted transition-all"
                        >
                            Settings
                        </Link>
                        <button
                            className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text-muted hover:bg-muted transition-all"
                            aria-label="Log out"
                        >
                            <LogOut className="mr-2 size-4" />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
