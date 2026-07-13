import { Link } from "react-router";
import { CircleUser, ChevronDown, GraduationCap, LogOut, Moon, Sun } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/hooks/use-theme";
import { useLogout } from "@/hooks/use-logout";
import { roleLabel } from "./role-label";

type UserMenuProps = {
    /**
     * @description Called when the menu opens or closes. Lets the Navbar keep
     * itself visible while the menu is open.
     */
    onOpenChange?: (open: boolean) => void;
};

/**
 * @description Header account menu. The trigger shows a generic user icon and
 * the logged-in user's name (truncated when tight). The dropdown shows the
 * user's role, the Tutorial link, a theme toggle, and logout. On narrow
 * screens (< md) it also includes the Reviews/Admin nav links, which are shown
 * as top-level header links at md and up.
 *
 * @param onOpenChange - Notified when the menu opens/closes.
 */
export function UserMenu({ onOpenChange }: UserMenuProps) {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const logout = useLogout();

    if (!user) return null;

    /** @description Reviews is open to every authenticated non-caregiver. */
    const showReviews = !!user.role && user.role !== "CAREGIVER";
    /** @description Admin is guarded to SYSADMIN and SITE_COORDINATOR only. */
    const showAdmin = user.role === "SYSADMIN" || user.role === "SITE_COORDINATOR";

    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 px-2 text-text"
                        aria-label="User menu"
                    >
                        <CircleUser className="size-5 shrink-0" />
                        <span className="hidden max-w-[10rem] truncate sm:inline">
                            {user.name}
                        </span>
                        <ChevronDown className="hidden size-4 shrink-0 sm:inline" />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-text">
                            {user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {roleLabel(user.role)}
                        </span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {showReviews && (
                    <DropdownMenuItem className="md:hidden" render={<Link to="/reviews" />}>
                        Reviews
                    </DropdownMenuItem>
                )}
                {showAdmin && (
                    <DropdownMenuItem className="md:hidden" render={<Link to="/admin" />}>
                        Admin
                    </DropdownMenuItem>
                )}
                {showReviews && <DropdownMenuSeparator className="md:hidden" />}

                <DropdownMenuItem render={<Link to="/tutorials" />}>
                    <GraduationCap className="size-4" />
                    Tutorial
                </DropdownMenuItem>

                <DropdownMenuItem closeOnClick={false} onClick={toggleTheme}>
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" onClick={logout}>
                    <LogOut className="size-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
