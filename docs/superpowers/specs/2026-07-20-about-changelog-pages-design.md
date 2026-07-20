# About Page & End-User Changelog — Design

**Date:** 2026-07-20
**Status:** Implemented (retroactive spec — written after implementation; see Process Note)
**Issue:** VMP-188
**Branch:** `vmp-188-add-an-simple-about-page-and-a-changelog-page` (based on `next`)

## Process Note

This spec was written **after** the code, which inverts the repo's standard
flow (brainstorm → written design → issue branch → implement → review). It is
backfilled to restore the design/plan artifact trail. The workflow reminder in
`CLAUDE.md` ("Feature workflow") exists so this does not recur.

## Problem

The application has no About page and no changelog. New and existing end users
(caregivers, site coordinators, clinical reviewers, admins) have no in-app place
to learn what Asclepion is, and no way to see what has recently changed as the
portal is actively iterated during testing. The ticket also asks that the About
entry point be reachable both while logged out and while logged in.

## Goal

Add a **simple public About page** and an **end-user-focused Changelog page**,
with entry points appropriate to auth state:

- **Non-authed pages:** an "About Asclepion" link near the light/dark toggle.
- **Logged-in users:** an "About" link in the top-right profile dropdown.
- **Changelog:** end-user worded (no dev jargon / ticket IDs), reachable from
  the About page.

Intentionally small: static informational content, no CMS, no backend.

## Existing State

- `frontend/src/router.tsx` — react-router v7 data router. Public routes are
  top-level entries with no guard (`/` Landing, `/login`, `/forgot-password`,
  `/reset-password`, `/signup/:token`); authed routes are children of a single
  `{ element: <Root/>, loader: authGuardLoader }`, role-partitioned below.
- `frontend/src/features/landing/Landing.tsx` (VMP-180) — public front door at
  `/`; the model for a simple public content page (grid layout, design tokens,
  `buttonVariants`, `ThemeToggle`, `AppVersion`). Public header at L24-26:
  `<header className="flex justify-end p-4"><ThemeToggle /></header>`.
- `frontend/src/features/login/login.tsx` — public auth page; fixed top-right
  `<ThemeToggle className="fixed top-4 right-4 z-50" />`.
- `frontend/src/features/layout/UserMenu.tsx` (VMP-171) — top-right profile
  dropdown (Base UI `DropdownMenu`); items include role label, Tutorial link,
  theme toggle, logout, and an `AppVersion` footer.
- `frontend/src/lib/version.ts` + `frontend/src/features/layout/AppVersion.tsx`
  (VMP-182/183/184) — version display surface reused in footers.
- **No changelog data exists** anywhere in the repo (confirmed via search) — a
  content source must be introduced.

These dependencies (landing page, user menu, login theme toggle) live on `next`
but **not** on `develop` (`next` is ~40 commits ahead), which is why the issue
branch is based on `next`, not `develop`.

## Decisions

1. **About = one public route (`/about`), serving both auth states.** Mirrors
   `Landing.tsx` (standalone, no app shell). Avoids duplicating the page as a
   separate authed route. Authed users reach it from the profile dropdown; the
   "Back" link targets `/`, which `landingLoader` redirects to the role home for
   logged-in users.
2. **Changelog = separate public route (`/changelog`), linked from About.** The
   ticket offered three placements (inline on About / linked from About / linked
   from every page); the middle option keeps About evergreen, lets the changelog
   grow without bloating About, and avoids per-page header clutter.
3. **Changelog content = a typed TS data module**, not Markdown or JSON. The
   codebase is TS-first with no Markdown renderer present; a typed array avoids a
   new dependency and keeps entries type-checked.
4. **Entry-point placement:** "About Asclepion" (full label) on the public
   Landing header and login corner; "About" (short label) in the authed profile
   dropdown, next to Tutorial. Forgot/reset-password pages are transient
   sub-flows of login and are intentionally not given the link.

## Design

### New: `frontend/src/features/about/changelog.ts`

```ts
export type ChangelogEntry = {
    date: string;      // ISO YYYY-MM-DD, displayed in UTC
    version?: string;  // app version when tagged
    highlights: string[]; // plain-language, end-user-facing
};
export const changelog: ChangelogEntry[]; // newest first
```

Seed content is derived from recently shipped work, reworded for end users (no
ticket numbers, no internal jargon): landing/light theme, About+changelog, copy
invite links, admin label fixes (2026-07-20); reliable playback + thumbnails,
smoother iPhone uploads, review stages, reviewer list, account menu
(2026-07-13).

### New: `frontend/src/features/about/AboutPage.tsx`

Public, Landing-styled (`grid min-h-screen grid-rows-[auto_1fr_auto]`, warm glow,
design tokens). Header: a "Back" ghost link → `/` and `<ThemeToggle/>`. Main: the
`A` brand tile, "About Asclepion" heading, two short descriptive paragraphs, and
an outline "What's new" button → `/changelog`. Footer reuses the Landing footer
line + `<AppVersion/>`.

### New: `frontend/src/features/about/ChangelogPage.tsx`

Public, same shell. Header "Back to About" → `/about`. Renders `changelog` as a
newest-first dated timeline (`<ol>` with a left border rail), each entry showing
a UTC-formatted date, an optional `v{version}` pill, and bulleted highlights. A
fixed `Intl.DateTimeFormat(..., { timeZone: "UTC" })` avoids off-by-one dates.

### Router (`router.tsx`)

Two new top-level public routes with no loader/guard:
`{ path: "/about", element: <AboutPage/> }` and
`{ path: "/changelog", element: <ChangelogPage/> }`.

### Entry points

- `Landing.tsx` — header becomes `flex items-center justify-end gap-1`; an
  "About Asclepion" ghost `Link` to `/about` precedes `<ThemeToggle/>`.
- `login.tsx` — the fixed toggle is wrapped in a `fixed top-4 right-4 z-50 flex
  items-center gap-1` container holding an "About Asclepion" link + `<ThemeToggle/>`.
- `UserMenu.tsx` — a new `DropdownMenuItem` (`Info` icon, "About") rendering a
  `Link` to `/about`, placed next to the Tutorial item.

## Data Flow

No API calls, no state stores. `changelog.ts` is a static import consumed by
`ChangelogPage`. Version display reuses the existing `AppVersion` component.

## Error / Edge Cases

- Routes are public and unguarded → reachable in every auth state; no crash for
  logged-out visitors.
- "Back" from About → `/`, which routes logged-in users onward via
  `landingLoader` and shows Landing for logged-out users.
- Changelog dates formatted in UTC to prevent timezone off-by-one.
- Empty `changelog` array renders an empty timeline (no crash).

## Testing

- `tsc -b` clean.
- Headless render smoke of `/about`, `/changelog`, `/`, `/login`: confirmed page
  content, dated changelog entries with correct UTC formatting and version pill,
  and that the Landing and login "About Asclepion" links resolve to `/about`.
- The authed `UserMenu` "About" item is a static `Link` to the verified `/about`
  route.

## Non-Goals

- Any backend, CMS, or dynamic/auto-generated changelog (e.g. from git or
  releases).
- A Markdown pipeline or new rendering dependency.
- A fuller profile/marketing site or editing UI.
- Entry links on the forgot/reset-password sub-flows.
