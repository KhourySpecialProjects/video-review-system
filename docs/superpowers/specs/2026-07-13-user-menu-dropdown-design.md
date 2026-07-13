# User Menu Dropdown — Design

**Date:** 2026-07-13
**Status:** Approved for planning

## Problem

The site header never shows who is logged in, which hurts both UX (users can't
confirm their identity) and debugging (no at-a-glance way to see the active
account and its role). The header also spreads several secondary controls —
the Tutorial link, the light/dark theme toggle, and the logout button — across
the top bar on desktop, and duplicates them in a hand-rolled mobile hamburger
menu.

## Goal

Introduce a single, responsive **user menu** in the header: a generic user icon
plus the logged-in user's name as the trigger, opening a dropdown that shows the
user's role and consolidates the Tutorial link, theme toggle, and logout. On
narrow widths the same dropdown also absorbs the primary nav links (Reviews,
Admin) that are otherwise shown top-level, replacing the current hamburger menu.

This is intentionally small. A fuller profile system is explicitly out of scope
(see Non-Goals).

## Existing State

- `frontend/src/features/layout/Navbar.tsx` — the header. Desktop shows
  role-gated `Reviews`/`Admin` links, a `Tutorial` link, `<ThemeToggle>`, and a
  logout icon button. A separate framer-motion hamburger menu (`menuOpen` state,
  `Menu`/`X` toggle) duplicates these on narrow screens and additionally embeds
  the caregiver `UploadCardStack`.
- `frontend/src/context/auth-context.tsx` — `useAuth()` returns `user` with
  `id`, `name` (a single string), `email`, and `role`.
- `shared/user.ts` — `role` is one of `CAREGIVER`, `CLINICAL_REVIEWER`,
  `SITE_COORDINATOR`, `SYSADMIN`.
- `frontend/src/components/ui/dropdown-menu.tsx` and `avatar.tsx` — shadcn
  primitives already present.
- `frontend/src/components/ThemeToggle.tsx` — wraps `useTheme()`.
- `frontend/src/hooks/use-logout.ts` — `useLogout()`.
- `frontend/src/features/layout/DesktopUploadIndicator.tsx` — caregiver upload
  count + cards, revealed on **hover** (does not work on touch).

## Decisions

1. **Name display:** show `user.name` as-is. No first/last split, no backend
   changes. (The data model has only a single `name` field.)
2. **Responsive mechanism:** CSS visibility via Tailwind (`hidden md:flex` /
   `md:hidden`), not a JS `useMediaQuery` breakpoint. Matches the existing
   `Navbar` pattern and avoids hydration flicker.
3. **Dropdown primitive:** the existing shadcn `DropdownMenu` (Radix). Replaces
   the hand-rolled framer-motion hamburger; gains keyboard + tap accessibility.
4. **Uploads stay separate:** the caregiver upload UI remains its own control at
   all widths, not folded into the user menu. To make it work on touch,
   `DesktopUploadIndicator` is converted from a hover reveal to a tap `Popover`.

## Design

### New component: `frontend/src/features/layout/UserMenu.tsx`

A self-contained dropdown built on `components/ui/dropdown-menu.tsx`.

**Trigger:**
- Generic user icon (lucide `CircleUser`) + `user.name` + a chevron.
- Name truncates with ellipsis when tight (`max-w-[10rem] truncate`); on very
  narrow widths the name may hide, leaving the icon only.
- Ghost button styling consistent with the current nav controls.

**Content (top → bottom):**
1. Label block: **name** (primary) and **role label** (muted sub-line), using
   `DropdownMenuLabel`. Non-interactive.
2. Separator.
3. `Reviews` and `Admin` items — rendered only on narrow screens
   (`md:hidden`), with the same role gating as the top-level links
   (`showReviews`, `showAdmin`). Followed by a separator that is also
   `md:hidden`.
4. `Tutorial` link item (navigates to `/tutorials`).
5. Theme toggle item: label reads `Switch to light mode` / `Switch to dark
   mode` with the matching icon; `onSelect` calls `preventDefault()` so the
   menu stays open and the theme flip is visible.
6. Separator.
7. **Log out** item, destructive styling, calls `useLogout()`.

**Role label helper** (colocated in `UserMenu.tsx` or a small util):

| role value          | display label      |
| ------------------- | ------------------ |
| `CAREGIVER`         | `Caregiver`        |
| `CLINICAL_REVIEWER` | `Clinical Reviewer`|
| `SITE_COORDINATOR`  | `Site Coordinator` |
| `SYSADMIN`          | `System Admin`     |

Unknown/absent role falls back to a neutral label (e.g. the raw value or
`Member`).

### `Navbar.tsx` changes

- **Remove:** the inline `<ThemeToggle>`, the logout `Button`, the desktop
  `Tutorial` link, and the entire mobile hamburger block — `menuOpen` state, the
  `Menu`/`X` toggle button, and the `motion.div` dropdown.
- **Keep:** `Reviews`/`Admin` as top-level links (`hidden md:flex`); the
  caregiver upload control (now the tap `Popover`, see below).
- **Add:** `<UserMenu />` at the right edge of the header.
- **Scroll-hide behavior:** the nav currently stays visible while `menuOpen`.
  Preserve equivalent behavior by keeping the nav visible while the user menu or
  the upload popover is open — e.g. `hide = scrollDirection === "down" &&
  !userMenuOpen && !uploadOpen`. Open state comes from the Radix components'
  `onOpenChange`. (Radix portals menu content to the body, so nav
  `overflow-hidden` no longer needs the `menuOpen ? overflow-visible` special
  case.)

### Upload indicator: hover → tap `Popover`

Convert `DesktopUploadIndicator` to open on click/tap using
`components/ui/popover.tsx` instead of the CSS `group-hover` reveal, keeping the
same trigger (count + badge) and the same card list content. This gives one
control that works at every width, so the upload cards no longer need to be
embedded in a menu. The component is shown whenever `uploads.length > 0`,
regardless of screen size. Rename to reflect it's no longer desktop-only if the
name becomes misleading (optional).

## Data Flow

`useAuth()` → `UserMenu` reads `user.name` and `user.role`. Role gating for the
narrow-screen `Reviews`/`Admin` items reuses the same predicates as `Navbar`
(`role && role !== "CAREGIVER"` for Reviews; `SYSADMIN`/`SITE_COORDINATOR` for
Admin). Theme via `useTheme()`; logout via `useLogout()`. No new API calls, no
new state stores.

## Error / Edge Cases

- **No user / still loading:** if `user` is null (e.g. `isLoading`), render
  nothing or a minimal placeholder for the trigger; do not crash on
  `user.name`.
- **Missing role:** fall back to the neutral role label; do not gate Reviews on
  an undefined role (existing predicate already handles this).
- **Long names:** truncate with ellipsis in the trigger; the full name is shown
  in the dropdown label block.
- **Theme toggle keeps menu open** via `preventDefault()` on select.

## Testing

- **Update `frontend/src/features/layout/Navbar.test.tsx`:** the header renders
  the user's name; the user menu contains Tutorial, theme toggle, and logout;
  Reviews/Admin exist in the menu markup (gated); the old hamburger toggle is
  gone.
- **New `frontend/src/features/layout/UserMenu.test.tsx`:** role-label mapping
  for each role and the fallback; Reviews/Admin gating by role; selecting Log
  out invokes `useLogout`; the theme item invokes `toggleTheme` and does not
  close the menu. (jsdom can't evaluate CSS media queries, so assert item
  presence in the markup rather than visual breakpoint behavior.)
- Existing suites (`npm run test`) and `npm run lint` / `npm run build` must
  stay green.

## Non-Goals

- Separate first/last name fields or any backend/schema change.
- A fuller profile page or profile-editing functionality (future work).
- Changing the caregiver upload logic itself (only its reveal interaction).
