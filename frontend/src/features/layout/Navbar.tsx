import { Link } from "react-router";
import { Sun, Moon, LogOut, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIncompleteUploads } from "./useIncompleteUploads";
import { UploadCardStack } from "./UploadCardStack";
import { DesktopUploadIndicator } from "./DesktopUploadIndicator";
import { Spinner } from "@/components/ui/spinner";

/**
 * @description Top navigation bar. Desktop shows nav links and an upload
 * indicator with hover dropdown. Mobile shows a hamburger that opens a
 * swipeable card stack for incomplete uploads plus nav links.
 */
export function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const { uploads, busy, isLoading, fileInputRef, onResume, onCancel, onFileChange } =
        useIncompleteUploads();

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-bg-light/80 px-4 py-2.5 backdrop-blur-xl shadow-s">
            {/* Hidden file input for resume uploads */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                className="hidden"
                onChange={onFileChange}
            />

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

            {/* Right-side controls */}
            <div className="flex items-center gap-1">
                {/* Desktop nav links */}
                <div className="hidden items-center gap-1 md:flex">
                    <Link to="/tutorials" className="inline-flex items-center justify-center rounded-md px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all">
                        Tutorial
                    </Link>
                </div>

                {/* Desktop upload indicator — hover to reveal list */}
                <div className="hidden md:block">
                    <DesktopUploadIndicator
                        uploads={uploads}
                        busy={busy}
                        onResume={onResume}
                        onCancel={onCancel}
                    />
                </div>

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
                    className="hidden text-text-muted md:inline-flex"
                    aria-label="Log out"
                >
                    <LogOut className="size-4" />
                </Button>

                {/* Mobile hamburger with red badge */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-text md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    {uploads.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                            {uploads.length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="absolute left-0 top-full w-full border-b border-border/50 bg-bg-light/80 p-4 backdrop-blur-xl z-50 md:hidden">
                    <div className="flex flex-col gap-2">
                        {/* Swipeable card stack */}
                        {isLoading ? (
                            <div className="flex justify-center py-3">
                                <Spinner />
                            </div>
                        ) : (
                            <UploadCardStack
                                uploads={uploads}
                                busy={busy}
                                onResume={onResume}
                                onCancel={onCancel}
                            />
                        )}

                        {/* Nav links */}
                        <Link
                            to="/tutorials"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center rounded-md px-2.5 py-2 text-sm font-medium text-text hover:bg-muted transition-all"
                        >
                            Tutorial
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
