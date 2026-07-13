# User Menu Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive header user menu (user icon + name, dropdown with role, Tutorial, theme toggle, logout) that also absorbs the Reviews/Admin nav links on narrow screens, replacing the hand-rolled hamburger.

**Architecture:** A new self-contained `UserMenu` component built on the existing Base UI `DropdownMenu`. Responsive behavior is pure CSS (`hidden md:flex` / `md:hidden`) — no JS breakpoints. The caregiver upload indicator is converted from a hover reveal to a tap `Popover` so it works at all widths and stays a separate control. `Navbar` is slimmed down to top-level Reviews/Admin links + upload indicator + `UserMenu`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Base UI (`@base-ui/react`) primitives, lucide-react icons, React Router v7, Vitest + Testing Library + user-event.

## Global Constraints

- Frontend package manager/commands: `npm run test` (Vitest single run), `npm run lint` (ESLint), `npm run build` (tsc + Vite). All must stay green.
- All frontend paths below are relative to `frontend/`. Run all commands from `frontend/`.
- UI primitives are **Base UI**, not Radix. Polymorphic rendering uses the `render={<Component/>}` prop. Menu items close on click by default; pass `closeOnClick={false}` to keep the menu open.
- Path alias `@/` → `frontend/src/`. Shared frontend types alias `@shared-types` → `frontend/types/`.
- Role enum values (verbatim): `CAREGIVER`, `CLINICAL_REVIEWER`, `SITE_COORDINATOR`, `SYSADMIN`.
- Auth: `useAuth()` from `@/context/auth-context` returns `{ user, isLoading }` where `user` is `{ id, name, email, role? } | null`.
- Display the user's name as-is (single `name` string). No first/last split, no backend changes.
- Unknown/missing role → label `"Member"`.

---

## File Structure

- **Create** `src/features/layout/role-label.ts` — pure `roleLabel(role?)` helper. (Task 1)
- **Create** `src/features/layout/role-label.test.ts` — helper unit tests. (Task 1)
- **Create** `src/features/layout/UserMenu.tsx` — the dropdown component. (Task 2)
- **Create** `src/features/layout/UserMenu.test.tsx` — component tests. (Task 2)
- **Modify** `src/features/layout/DesktopUploadIndicator.tsx` — hover → tap `Popover`, add `onOpenChange`. (Task 3)
- **Create** `src/features/layout/DesktopUploadIndicator.test.tsx` — popover open tests. (Task 3)
- **Modify** `src/features/layout/Navbar.tsx` — remove hamburger/inline controls, add `UserMenu`, wire open-state to scroll-hide. (Task 4)
- **Modify** `src/features/layout/Navbar.test.tsx` — update for the new structure. (Task 4)

---

### Task 1: Role label helper

**Files:**
- Create: `src/features/layout/role-label.ts`
- Test: `src/features/layout/role-label.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `roleLabel(role?: string): string` — maps a role enum value to a human-friendly label; returns `"Member"` for missing/unknown roles.

- [ ] **Step 1: Write the failing test**

Create `src/features/layout/role-label.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roleLabel } from "./role-label";

describe("roleLabel", () => {
    it("maps known roles to friendly labels", () => {
        expect(roleLabel("CAREGIVER")).toBe("Caregiver");
        expect(roleLabel("CLINICAL_REVIEWER")).toBe("Clinical Reviewer");
        expect(roleLabel("SITE_COORDINATOR")).toBe("Site Coordinator");
        expect(roleLabel("SYSADMIN")).toBe("System Admin");
    });

    it("falls back to Member for a missing role", () => {
        expect(roleLabel(undefined)).toBe("Member");
    });

    it("falls back to Member for an unknown role", () => {
        expect(roleLabel("MARKETING_INTERN")).toBe("Member");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/layout/role-label.test.ts`
Expected: FAIL — cannot resolve `./role-label` / `roleLabel is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/layout/role-label.ts`:

```ts
/** @description Human-friendly labels for each backend role enum value. */
const ROLE_LABELS: Record<string, string> = {
    CAREGIVER: "Caregiver",
    CLINICAL_REVIEWER: "Clinical Reviewer",
    SITE_COORDINATOR: "Site Coordinator",
    SYSADMIN: "System Admin",
};

/**
 * @description Returns a display label for a user's role. Unknown or missing
 * roles fall back to "Member".
 *
 * @param role - The backend role enum value, if any.
 * @returns A human-friendly role label.
 */
export function roleLabel(role?: string): string {
    if (!role) return "Member";
    return ROLE_LABELS[role] ?? "Member";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/layout/role-label.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/layout/role-label.ts src/features/layout/role-label.test.ts
git commit -m "feat: add roleLabel helper for user menu"
```

---

### Task 2: UserMenu component

**Files:**
- Create: `src/features/layout/UserMenu.tsx`
- Test: `src/features/layout/UserMenu.test.tsx`

**Interfaces:**
- Consumes: `roleLabel` (Task 1); `useAuth` from `@/context/auth-context`; `useTheme` from `@/hooks/use-theme` (`{ theme, toggleTheme }`); `useLogout` from `@/hooks/use-logout` (returns an async handler); `DropdownMenu*` from `@/components/ui/dropdown-menu`; `Button` from `@/components/ui/button`.
- Produces: `UserMenu(props: { onOpenChange?: (open: boolean) => void }): JSX.Element | null`. Returns `null` when there is no authenticated user. Trigger button has `aria-label="User menu"`. Reviews/Admin items are gated (`showReviews = role && role !== "CAREGIVER"`; `showAdmin = role === "SYSADMIN" || role === "SITE_COORDINATOR"`) and hidden at `md` and up via `className="md:hidden"`.

- [ ] **Step 1: Write the failing test**

Create `src/features/layout/UserMenu.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";

const authState: { user: { name: string; role?: string } | null } = { user: null };
const toggleTheme = vi.fn();
const logout = vi.fn();

vi.mock("@/context/auth-context", () => ({
    useAuth: () => ({ user: authState.user, isLoading: false }),
}));
vi.mock("@/hooks/use-theme", () => ({
    useTheme: () => ({ theme: "light", toggleTheme, setTheme: vi.fn() }),
}));
vi.mock("@/hooks/use-logout", () => ({
    useLogout: () => logout,
}));

import { UserMenu } from "./UserMenu";

function renderUserMenu() {
    const router = createMemoryRouter([{ path: "/", element: <UserMenu /> }]);
    return render(<RouterProvider router={router} />);
}

describe("UserMenu", () => {
    beforeEach(() => {
        authState.user = null;
        toggleTheme.mockClear();
        logout.mockClear();
    });

    it("renders nothing when logged out", () => {
        const { container } = renderUserMenu();
        expect(container).toBeEmptyDOMElement();
    });

    it("shows the user's name on the trigger", () => {
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("shows the role label, Tutorial, theme toggle and logout when opened", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "CLINICAL_REVIEWER" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Clinical Reviewer")).toBeInTheDocument();
        expect(screen.getByText("Tutorial")).toBeInTheDocument();
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
        expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("invokes logout when Log out is chosen", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        await user.click(await screen.findByText("Log out"));
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it("toggles theme without closing the menu", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        await user.click(await screen.findByText("Switch to dark mode"));
        expect(toggleTheme).toHaveBeenCalledTimes(1);
        // Menu stayed open (closeOnClick={false}): item still present.
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
    });

    it("includes Reviews and Admin items for a sysadmin", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("omits Reviews and Admin items for a caregiver", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderUserMenu();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Tutorial")).toBeInTheDocument();
        expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/layout/UserMenu.test.tsx`
Expected: FAIL — cannot resolve `./UserMenu`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/layout/UserMenu.tsx`:

```tsx
import { Link } from "react-router";
import { CircleUser, ChevronDown, GraduationCap, LogOut, Moon, Sun } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
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
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-text">
                        {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {roleLabel(user.role)}
                    </span>
                </DropdownMenuLabel>

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/layout/UserMenu.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/layout/UserMenu.tsx src/features/layout/UserMenu.test.tsx
git commit -m "feat: add UserMenu dropdown component"
```

---

### Task 3: Convert upload indicator to a tap Popover

**Files:**
- Modify: `src/features/layout/DesktopUploadIndicator.tsx`
- Test: `src/features/layout/DesktopUploadIndicator.test.tsx`

**Interfaces:**
- Consumes: `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`; `UploadCard` from `./UploadCard`; `IncompleteUpload` from `@shared-types/video`.
- Produces: `DesktopUploadIndicator(props: { uploads: IncompleteUpload[]; busy: boolean; onResume: (videoId: string) => void; onCancel: (videoId: string) => void; onOpenChange?: (open: boolean) => void }): JSX.Element | null`. Returns `null` when `uploads.length === 0`. The trigger button has `aria-label="Incomplete uploads (N)"`. Opens on click/tap (no longer hover).

- [ ] **Step 1: Write the failing test**

Create `src/features/layout/DesktopUploadIndicator.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IncompleteUpload } from "@shared-types/video";

// Isolate the indicator from UploadCard's heavier dependency tree.
vi.mock("./UploadCard", () => ({
    UploadCard: ({ upload }: { upload: IncompleteUpload }) => (
        <div data-testid="upload-card">{upload.fileName}</div>
    ),
}));

import { DesktopUploadIndicator } from "./DesktopUploadIndicator";

const uploads: IncompleteUpload[] = [
    {
        videoId: "v1",
        fileName: "clip-one.mp4",
        fileSize: 1000,
        bytesUploaded: 500,
        totalParts: 2,
        uploadedPartCount: 1,
        createdAt: "2026-07-13T00:00:00.000Z",
    },
];

const noop = () => {};

describe("DesktopUploadIndicator", () => {
    it("renders nothing when there are no uploads", () => {
        const { container } = render(
            <DesktopUploadIndicator uploads={[]} busy={false} onResume={noop} onCancel={noop} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows a count trigger and reveals cards on click", async () => {
        const user = userEvent.setup();
        render(
            <DesktopUploadIndicator uploads={uploads} busy={false} onResume={noop} onCancel={noop} />,
        );
        // Cards are not visible until the popover is opened.
        expect(screen.queryByTestId("upload-card")).not.toBeInTheDocument();
        await user.click(screen.getByLabelText("Incomplete uploads (1)"));
        expect(await screen.findByText("clip-one.mp4")).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/layout/DesktopUploadIndicator.test.tsx`
Expected: FAIL — the current hover implementation renders the cards immediately (no popover), so `queryByTestId("upload-card")` is present before any click, and/or there is no `aria-label="Incomplete uploads (1)"` trigger.

- [ ] **Step 3: Write minimal implementation**

Replace the entire contents of `src/features/layout/DesktopUploadIndicator.tsx` with:

```tsx
import type { IncompleteUpload } from "@shared-types/video";
import { CloudUpload } from "lucide-react";
import { UploadCard } from "./UploadCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DesktopUploadIndicatorProps = {
    uploads: IncompleteUpload[];
    busy: boolean;
    onResume: (videoId: string) => void;
    onCancel: (videoId: string) => void;
    /** @description Notified when the popover opens/closes. */
    onOpenChange?: (open: boolean) => void;
};

/**
 * @description Navbar element showing the incomplete upload count. Opens a
 * popover of upload cards on click/tap, so it works on both desktop and
 * touch. Hidden when the count is 0.
 *
 * @param uploads - List of incomplete uploads.
 * @param busy - Whether a fetcher action is in flight.
 * @param onResume - Called with videoId when the user clicks Resume.
 * @param onCancel - Called with videoId when the user confirms cancel.
 * @param onOpenChange - Notified when the popover opens/closes.
 */
export function DesktopUploadIndicator({
    uploads,
    busy,
    onResume,
    onCancel,
    onOpenChange,
}: DesktopUploadIndicatorProps) {
    if (uploads.length === 0) return null;

    return (
        <Popover onOpenChange={onOpenChange}>
            <PopoverTrigger
                render={
                    <button
                        className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-warning hover:bg-muted transition-all"
                        aria-label={`Incomplete uploads (${uploads.length})`}
                    >
                        <CloudUpload className="size-4" />
                        <span>{uploads.length}</span>
                        <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-destructive" />
                    </button>
                }
            />
            <PopoverContent align="end" className="w-80 gap-2 p-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-warning">
                    Incomplete Uploads ({uploads.length})
                </p>
                <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {uploads.map((upload) => (
                        <UploadCard
                            key={upload.videoId}
                            upload={upload}
                            busy={busy}
                            onResume={() => onResume(upload.videoId)}
                            onCancel={() => onCancel(upload.videoId)}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/layout/DesktopUploadIndicator.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/layout/DesktopUploadIndicator.tsx src/features/layout/DesktopUploadIndicator.test.tsx
git commit -m "feat: open upload indicator on tap via popover"
```

---

### Task 4: Integrate into Navbar and update tests

**Files:**
- Modify: `src/features/layout/Navbar.tsx`
- Modify: `src/features/layout/Navbar.test.tsx`

**Interfaces:**
- Consumes: `UserMenu` (Task 2); `DesktopUploadIndicator` with its new `onOpenChange` (Task 3).
- Produces: a `Navbar` whose right cluster is: top-level `Reviews`/`Admin` links (`hidden md:flex`), the caregiver upload indicator (shown at all widths when uploads exist), and `<UserMenu />`. No hamburger, no inline theme/logout/Tutorial. The nav stays visible while the user menu or upload popover is open.

- [ ] **Step 1: Update the Navbar test first (red)**

Replace the entire contents of `src/features/layout/Navbar.test.tsx` with:

```tsx
import { useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";

/**
 * @description Mutable auth state consumed by the mocked useAuth below.
 * Tests set `authState.user` before rendering; beforeEach resets it.
 */
const authState: { user: { name: string; role?: string } | null } = { user: null };

vi.mock("@/context/auth-context", () => ({
    useAuth: () => ({ user: authState.user, isLoading: false }),
}));

import { Navbar } from "./Navbar";

/**
 * @description Wrapper that owns the scroll container ref and passes it to the
 * Navbar. The Navbar's `useScroll` asserts the container ref is hydrated on
 * mount, so the ref must point at a real element rendered alongside the Navbar.
 */
function ScrollShell() {
    const scrollContainerRef = useRef<HTMLElement>(null);
    return (
        <>
            <Navbar scrollContainerRef={scrollContainerRef} />
            <main ref={scrollContainerRef as React.RefObject<HTMLElement>} />
            <Outlet />
        </>
    );
}

function renderNavbar() {
    const router = createMemoryRouter([
        { path: "/", element: <ScrollShell /> },
        { path: "/incomplete-uploads", loader: () => ({ uploads: [] }) },
    ]);
    return render(<RouterProvider router={router} />);
}

describe("Navbar", () => {
    beforeEach(() => {
        authState.user = null;
    });

    it("renders the logo", () => {
        renderNavbar();
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("Asclepion")).toBeInTheDocument();
    });

    it("shows the logged-in user's name in the header", () => {
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("exposes Tutorial, theme toggle and logout in the user menu", async () => {
        const user = userEvent.setup();
        authState.user = { name: "Jane Doe", role: "SYSADMIN" };
        renderNavbar();
        await user.click(screen.getByLabelText("User menu"));
        expect(await screen.findByText("Tutorial")).toBeInTheDocument();
        expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
        expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("shows top-level Reviews and Admin links for a sysadmin", () => {
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows top-level Reviews and Admin links for a site coordinator", () => {
        authState.user = { name: "Coco Ord", role: "SITE_COORDINATOR" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows Reviews but not Admin for a clinical reviewer", () => {
        authState.user = { name: "Rey View", role: "CLINICAL_REVIEWER" };
        renderNavbar();
        expect(screen.getByText("Reviews")).toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("hides Reviews and Admin for caregivers", () => {
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderNavbar();
        expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });
});
```

Note: `vi.mock` calls are hoisted to the top of the module by Vitest, so the mock is registered before `import { Navbar }` runs. `vi` is imported explicitly (matching the rest of this repo's test files, which import their test globals from `"vitest"`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/features/layout/Navbar.test.tsx`
Expected: FAIL — `getByLabelText("User menu")` and `getByText("Jane Doe")` fail because `Navbar` does not yet render `UserMenu`.

- [ ] **Step 3: Update the Navbar imports**

In `src/features/layout/Navbar.tsx`, replace the top import block (lines 1-12, from `import { Link }` through `import { Spinner }`) with:

```tsx
import { Link } from "react-router";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { useIncompleteUploads } from "./useIncompleteUploads";
import { DesktopUploadIndicator } from "./DesktopUploadIndicator";
import { UserMenu } from "./UserMenu";
```

(Removed: `LogOut`, `Menu`, `X` from lucide; `AnimatePresence`; `ThemeToggle`; `useLogout`; `UploadCardStack`; `Spinner`. `useLogout`, `ThemeToggle`, and logout now live in `UserMenu`.)

- [ ] **Step 4: Update component state and derived flags**

In the `Navbar` function body, replace these lines:

```tsx
    const logout = useLogout();
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
    const { uploads, busy, isLoading, isCaregiver, fileInputRef, onResume, onCancel, onFileChange } =
        useIncompleteUploads();
```

with:

```tsx
    const { user } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
    const { uploads, busy, isCaregiver, fileInputRef, onResume, onCancel, onFileChange } =
        useIncompleteUploads();
```

(`isLoading` is dropped — the standalone upload indicator has no loading state; `logout` moved into `UserMenu`.)

- [ ] **Step 5: Update the scroll-hide condition**

Replace this line:

```tsx
    const hide = scrollDirection === "down" && !menuOpen;
```

with:

```tsx
    // Stay visible while a menu/popover is open so it doesn't scroll away
    // under the user's finger.
    const hide = scrollDirection === "down" && !userMenuOpen && !uploadOpen;
```

- [ ] **Step 6: Simplify the nav container className**

Replace the `className` expression on the `motion.nav` (the string-concatenation with the `menuOpen ? "overflow-visible" : "overflow-hidden"` ternary, plus its preceding explanatory comment about overflow) with a single static class string:

```tsx
            className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-bg-light px-4 py-2.5 shadow-s overflow-hidden"
```

(The mobile dropdown that needed `overflow-visible` is gone; the upload popover and user menu are portaled to the body, so `overflow-hidden` no longer clips them.)

- [ ] **Step 7: Replace the right-hand controls cluster**

Replace the entire right-hand `<div className="flex items-center gap-1">…</div>` block (currently the desktop links, `DesktopUploadIndicator` wrapper, `ThemeToggle`, logout `Button`, and hamburger `Button` — from the opening `<div className="flex items-center gap-1">` through its matching closing `</div>` just before the `<AnimatePresence>` block) with:

```tsx
            <div className="flex items-center gap-1">
                <div className="hidden items-center gap-1 md:flex">
                    {showReviews && (
                        <Link to="/reviews" className={desktopLinkClass}>
                            Reviews
                        </Link>
                    )}
                    {showAdmin && (
                        <Link to="/admin" className={desktopLinkClass}>
                            Admin
                        </Link>
                    )}
                </div>

                {isCaregiver && (
                    <DesktopUploadIndicator
                        uploads={uploads}
                        busy={busy}
                        onResume={onResume}
                        onCancel={onCancel}
                        onOpenChange={setUploadOpen}
                    />
                )}

                <UserMenu onOpenChange={setUserMenuOpen} />
            </div>
```

(The Tutorial link is removed from the top-level cluster — it now lives in `UserMenu`.)

- [ ] **Step 8: Remove the mobile dropdown menu block**

Delete the entire `<AnimatePresence initial={false}>…</AnimatePresence>` block that renders the `menuOpen` mobile dropdown (the `motion.div key="mobile-menu"` and everything inside it, through the closing `</AnimatePresence>`). The hidden caregiver file `<input>` block near the top of the nav stays — it is still used by `onFileChange`.

After this edit, the `motion.nav` should contain only: the caregiver file `<input>`, the logo `<Link>`, and the right-hand controls `<div>`.

- [ ] **Step 9: Verify the feature builds and lints**

Run: `npm run lint`
Expected: no errors. In particular, no "unused variable" for `isLoading`, `menuOpen`, `logout`, `AnimatePresence`, `ThemeToggle`, `UploadCardStack`, `Spinner`, `LogOut`, `Menu`, or `X` — all should have been removed. If lint reports any as still-imported-but-unused, remove the stray reference.

Run: `npm run build`
Expected: type-check + build succeed.

- [ ] **Step 10: Run the full test suite**

Run: `npm run test`
Expected: PASS — all suites green, including the rewritten `Navbar.test.tsx` (7 tests), `UserMenu.test.tsx`, `DesktopUploadIndicator.test.tsx`, and `role-label.test.ts`.

- [ ] **Step 11: Commit**

```bash
git add src/features/layout/Navbar.tsx src/features/layout/Navbar.test.tsx
git commit -m "feat: replace navbar controls with user menu dropdown"
```

---

## Manual verification (after Task 4)

Run `npm run dev` and confirm:
- Header shows the user icon + name; clicking opens the dropdown with name, role, Tutorial, theme toggle, and logout.
- Theme toggle flips light/dark and the menu stays open.
- On a wide window, Reviews/Admin are top-level links and NOT duplicated in the dropdown; narrowing the window (< `md`) moves Reviews/Admin into the dropdown and hides the top-level links.
- Logout signs out and redirects to `/login`.
- As a caregiver with an incomplete upload, the upload count control opens its cards on tap at both wide and narrow widths.

## Self-Review Notes

- **Spec coverage:** user icon + name (Task 2 trigger); role in dropdown (Task 2 label + Task 1 helper); Tutorial/theme/logout consolidated (Task 2); responsive Reviews/Admin (Task 2 `md:hidden` + Task 4 `hidden md:flex`); uploads separate & tappable (Task 3); hamburger removed (Task 4); tests (all tasks); name-as-is + `"Member"` fallback (Tasks 1-2). All covered.
- **Non-goals** (first/last fields, profile page): not implemented, as intended.
