# Asclepion Landing Page — Design (VMP-180)

**Status:** Approved design, pre-implementation
**Ticket:** VMP-180 — Add an updated application landing page
**Date:** 2026-07-19

## Problem

The root route `/` is not a page — it is an auth gate. `authGuardLoader` redirects
unauthenticated visitors straight to `/login`, and for authenticated caregivers `/`
*is* their dashboard (the index of the `Home` route). There is no public front door
for the product.

VMP-180: add a properly themed Asclepion landing page at `/` with a clear path to login.

## Goals

- A calm, trustworthy, on-brand **front door** at `/` for logged-out visitors.
- A clear **Log in** call to action → `/login`.
- Consistency with the existing design system (light-mode default, terracotta primary,
  system font, shadcn tokens). No new visual identity.
- Leave room for a future **About** page (VMP-180 does *not* build it).

## Non-goals

- No About/contributors page in this ticket (designed-for, not built).
- No new logo artwork. The existing "A" mark (favicon) is scaled up and used as-is.
- No marketing sections, feature lists, testimonials, or imagery.
- No change to the authenticated app's look or behavior beyond the home-URL move below.

## Audience & tone

Asclepion is the brand; the product is the **Angelman Syndrome Video Management Portal** —
caregivers upload seizure videos for clinical research, in collaboration with
Dr. Wen-Hann Tan and the Angelman Syndrome Clinical Research Group at Boston Children's
Hospital. Families of children with AS and clinical staff are the audience. The page reads
**restrained and warm**, not marketing hype.

## Content & layout

One viewport, no scroll. Three rows (`grid-template-rows: auto 1fr auto`):

1. **Top bar** — theme toggle only, fixed top-right, mirroring the login page
   (`ThemeToggle` component, same as `login.tsx`).
2. **Hero** (centered):
   - The "A" mark, scaled up (~104px), same terracotta rounded square as `favicon.svg`.
   - "Asclepion" wordmark in `text-primary`.
   - One tagline line (mission/warmth voice):
     > Helping families, caregivers, and clinicians advance Angelman Syndrome research together.
   - Primary **Log in** button linking to `/login`.
   - A barely-there radial warm glow behind the hero (only decorative flourish).
3. **Footer** — quiet, muted: `Angelman Syndrome Video Management Portal` ·
   `In collaboration with Boston Children's Hospital` · the existing `AppVersion` component.
   Layout accommodates a future **About** link without redesign.

Reference mockup (real tokens, light + dark):
https://claude.ai/code/artifact/60ab55f0-c787-4b43-a1aa-a35b4e9f6608

Copy is tweakable during implementation; wording above is the intended default.

## Routing changes

The landing must own `/` for logged-out visitors while authenticated users continue to
their dashboards. The caregiver dashboard currently lives at the `/` index, so it moves
to `/home`.

### New/changed routes

- **`/` (public, no app shell)** → `<Landing />`, with a **splitter loader**:
  - No session → return `null` (render the landing).
  - `role === "CAREGIVER"` → `redirect("/home")`.
  - Any other authenticated role → `redirect("/reviews")`.
  The splitter reuses `fetchSession()` from `auth-guard.ts` (shared in-flight session read).
- **Authenticated shell** (`<Root />` + `authGuardLoader`) becomes a **pathless layout
  route** wrapping the authenticated children (it no longer owns `path: "/"`).
- **Caregiver dashboard moves from `/` → `/home`**:
  - `Home` route becomes `path: "home"`; its `index` child (dashboard) is now at `/home`,
    and its `search` child moves from `/search` → `/home/search`.
- `/login`, `/forgot-password`, `/reset-password`, `/signup/:token`, and all `/admin/*`
  and other data routes are unchanged.

### Reference updates (blast radius — audited)

- `hooks/auth-guard.ts` — `caregiverGuardLoader` / `adminGuardLoader` redirect caregivers
  with `redirect("/")` → change to `redirect("/home")` (lines ~80, ~94).
- `routes/video-view.tsx:36` — caregiver back-link `to="/"` → `to="/home"`.
- `routes/home.tsx` — tab nav: `location.pathname === "/search"` → `"/home/search"`;
  `navigate(tab === "all" ? "/search" : "/")` → `"/home/search"` : `"/home"` (lines ~24, ~35).
- `features/layout/Navbar.tsx:83` — caregiver logo link `"/"` → `"/home"`
  (non-caregiver branch stays `/reviews`).
- `hooks/use-login.ts:46` — `redirect("/")` after login is **kept as-is**: it now flows
  through the `/` splitter, which routes each role to its correct home. (Single source of
  post-login role routing = the splitter.)

## New component

`src/features/landing/Landing.tsx` (new `landing/` feature folder) — a self-contained
page component. No navbar/`Root` shell. Uses existing `@/components/ui/button`,
`ThemeToggle`, `AppVersion`, and design tokens. Route + splitter loader wired in
`router.tsx` (loader can live alongside the component, e.g. `landing.route.ts`, matching
the repo's route-module convention).

## Testing

- **Landing route (logged out):** splitter returns `null`; page renders the wordmark,
  tagline, and a **Log in** link pointing to `/login`.
- **Splitter (authenticated):** caregiver session → redirect to `/home`; non-caregiver
  session → redirect to `/reviews`.
- **Caregiver home move:** authenticated caregiver at `/home` renders the dashboard;
  tab nav targets `/home/search`.
- Follow the colocated Vitest + Testing Library pattern used elsewhere in the repo.

## Risks / notes

- Moving the caregiver home URL (`/` → `/home`) is the only behavior change for existing
  users; bookmarks to `/` resolve seamlessly via the splitter redirect.
- Extra redirect hop after login (`/login` → `/` → `/home` or `/reviews`) is acceptable
  and keeps role-routing in one place.
- The mark is CSS/text, not artwork — a bespoke logo remains future work if desired.
