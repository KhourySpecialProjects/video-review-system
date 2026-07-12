# Minor UI Tweaks — Design

**Date:** 2026-07-12
**Status:** Approved (brainstorming)
**Scope:** Five small, independent frontend UI enhancements, shipped in a single PR into `develop`.

## Goal

A batch of minor UI polish items for the Asclepion app. Each is small and independent; they are grouped into one branch/PR because none is large enough to warrant its own.

## Tweaks

### 1. Upload button icon
The caregiver "Upload Video" button uses a download icon, which reads as the wrong action.

- **File:** `frontend/src/features/video/videoUpload/VideoUpload.tsx` (~line 62).
- **Change:** replace the lucide `Download` icon on the upload trigger button with `Upload` (up-arrow-into-tray); update the import accordingly.
- **Leave alone:** `CompletedStep.tsx`'s `Download` icon — that represents a genuine "save to device" action.

### 2. Favicon
The site still uses the default Vite favicon.

- **Add:** `frontend/public/favicon.svg` — a rounded-corner tile filled with the theme primary color (`--custom-primary`) and a centered white "A".
- **Update:** `index.html` `<link rel="icon">` to point at `/favicon.svg` (currently `/vite.svg`).
- **Remove:** `frontend/public/vite.svg` once it is no longer referenced.
- The "A" is deliberately consistent with the logo monogram (tweak 3) and is placeholder-quality — easy to swap for a real mark later.

### 3. Logo (top-left)
The top-left logo shows "CV", which has no relation to the app.

- **File:** `frontend/src/features/layout/Navbar.tsx` (~lines 105–108).
- **Change:** keep the rounded `bg-primary` tile but change the letters `CV` → `A`, and add an `Asclepion` wordmark span beside it. The wordmark is `hidden sm:inline` (or equivalent) so it does not crowd small screens; the tile alone remains on mobile.
- **Test:** `Navbar.test.tsx` currently asserts `getByText("CV")`; update it to assert the new "A" monogram and the "Asclepion" wordmark.

### 4. Environment banner
Add a banner strip directly above the main header (`<Navbar>`) that identifies non-production environments. Three-way behavior driven by build-time flags:

| Environment | Detection | Banner text |
|---|---|---|
| Local dev | `import.meta.env.DEV` | `Local Development Preview` |
| Coolify dev deploy | `import.meta.env.VITE_APP_ENV === 'dev-preview'` | `Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.` |
| Production (AWS, future) | neither flag set | *(no banner)* |

- **Precedence:** check `import.meta.env.DEV` first (local), then `VITE_APP_ENV === 'dev-preview'` (Coolify), else render nothing.
- **New component:** `frontend/src/features/layout/DevBanner.tsx` — returns `null` when in production; otherwise renders a full-width, single-line strip.
- **Mount point:** `frontend/src/routes/root.tsx`, immediately above `<Navbar>` (~line 36). The banner is **not** sticky, so it scrolls away and the existing `sticky top-0` Navbar behavior is unchanged.
- **Styling:** theme `--warning` (amber) background with dark/high-contrast text, small font, centered, not dismissable. Stands out as a conventional "non-prod" strip without clashing with the theme.
- **Wiring the Coolify flag:** Vite inlines `VITE_`-prefixed vars at build time, so the flag must be present during `npm run build`:
  - `frontend/Dockerfile`: add `ARG VITE_APP_ENV` and `ENV VITE_APP_ENV=$VITE_APP_ENV` before the `RUN npm run build` step.
  - `docker-compose.coolify.yml`: add `build.args: { VITE_APP_ENV: dev-preview }` to the `frontend` service.
  - When the arg is unset (local production build, AWS), `VITE_APP_ENV` is empty → banner hidden. Local `npm run dev` shows the local banner via `import.meta.env.DEV`.
  - **TypeScript:** declare `VITE_APP_ENV?: string` on `ImportMetaEnv` in `frontend/src/vite-env.d.ts` so `tsc` accepts the reference.

### 5. Tab count badges (reviewer annotations panel)
The reviewer's Annotations panel has three tabs (Clips, Notes, Draw) with no indication of how many entries each holds.

- **File:** `frontend/src/features/sidebar/sidebar.tsx` — the tab loop (~lines 127–144).
- **Change:** next to each tab label, render a small count badge using the already-available `clips.length` / `notes.length` / `drawings.length`.
- **Visibility:** show the badge only when the count is `> 0` (empty tabs stay clean, like unread-email counts).
- **Styling:** tiny rounded pill — `bg-muted-foreground/15`, `text-muted-foreground`, `text-xs`, `tabular-nums` — present but visually quiet, sitting within the existing tab trigger without disturbing the active-tab motion indicator.

## Testing

- **TDD** for the items with real logic:
  - `DevBanner`: renders local text when `import.meta.env.DEV`, renders the Coolify text + PII warning when `VITE_APP_ENV === 'dev-preview'`, renders nothing in production.
  - Tab badges: badge present with the correct number when count > 0; absent when count is 0.
- **Update** `Navbar.test.tsx` for the new logo.
- The icon swap and favicon are trivial static changes (no dedicated unit test).
- Full frontend suite + typecheck must stay green (modulo the known pre-existing failures unrelated to these files).

## Out of scope / notes

- No real/branded logo or favicon artwork — placeholder "A" monogram only; a real mark is a later task.
- The banner is informational only (no dismiss/persistence).
- Does not touch backend, auth, or data.

## Process

- One umbrella Linear issue covering the five tweaks.
- One branch off `develop`, one PR back into `develop`.
