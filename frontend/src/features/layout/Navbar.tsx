import { Link, useNavigate } from "react-router";
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
import { authClient } from "@/lib/auth-client";
import { AnimatePresence, motion } from "motion/react";

interface NavbarProps {
    user: {
        name: string;
        email: string;
    };
}

export function Navbar({ user }: NavbarProps) {
    const { theme, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const navigate = useNavigate();

    const handleSignOut = async () => {
        setIsSigningOut(true);
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    navigate("/sign-in");
                },
            },
        });
        setIsSigningOut(false);
    };

    // Get initials from user name
    const initials = user.name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg-dark px-4 py-2">
            {/* Logo */}
            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    {initials}
                </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
                <Link to="/" className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all">
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
                    onClick={handleSignOut}
                    disabled={isSigningOut}
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
                    className="text-text overflow-hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {menuOpen ? (
                            <motion.div
                                key="x"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.15 }}
                            >
                                <X className="size-5" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, rotate: 90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: -90 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Menu className="size-5" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{ transformOrigin: "top" }}
                        className="absolute left-0 top-full w-full border-b border-border bg-bg-dark p-4 md:hidden"
                    >
                        <div className="flex flex-col gap-2">
                            <Link
                                to="/"
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
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                            >
                                <LogOut className="mr-2 size-4" />
                                {isSigningOut ? "Signing out..." : "Log out"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
