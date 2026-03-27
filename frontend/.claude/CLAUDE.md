# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (HTTPS via basicSsl, port forwarded to 0.0.0.0)
npm run build      # Type-check + Vite production build
npm run lint       # ESLint
npm run test       # Vitest (single run)
npm run test:watch # Vitest in watch mode
```

Run a single test file:
```bash
npx vitest run src/features/video/videoCard/VideoCard.test.tsx
```

## Architecture

This is a **React 19 + Vite + TypeScript** SPA for a caregiver video management portal. It is the frontend of a larger system; a Go backend runs on `localhost:8080` and is proxied via `/api` in dev.

### Routing (React Router v7)

- `src/router.tsx` — defines two routes using `createBrowserRouter`
- `src/routes/root.tsx` — layout shell with `<Navbar>` and `<Outlet>`
- `src/routes/home.tsx` — dashboard with recent/all video tabs + upload button
- `src/routes/video-view.tsx` — video player + editable sidebar

Route loaders return data directly from `src/lib/mock-data.ts` (simulated async). **In production, these loaders will call the Go API.** The home route uses React Router's `<Await>` + `<Suspense>` streaming pattern — the loader returns a raw Promise and the page renders immediately with a skeleton.

### Feature Structure (`src/features/`)

- **`layout/`** — `Navbar` (top nav)
- **`dashboard/`** — `WelcomeCard`, `TabBar` (recent/all tabs)
- **`video/videoCard/`** — card component shown in the grid
- **`video/allVideos/`** — full video list view
- **`video/videoPlayer/`** — custom HTML5 video player with seek/mute/fullscreen
- **`video/videoDetails/`** — editable sidebar (title, description) using React Router form actions
- **`video/videoUpload/`** — multi-step upload dialog (select → details → complete)
- **`video/downscaler/`** — client-side video transcoding pipeline

### Client-Side Video Transcoding (`src/features/video/downscaler/`)

Two implementations exist:
- **`convert.ts`** — uses Mediabunny's high-level `Conversion` API (currently active in `VideoUpload`)
- **`downscale.ts`** — manual WebCodecs pipeline: demux → decode → GPU scale (WebGPU/WebGL2 via `scalers.ts`) → H.264 encode → mux MP4

The dev server sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers required for `SharedArrayBuffer` / WebGPU.

### Data Layer

- `src/lib/types.ts` — `Video` and `VideoStatus` types
- `src/lib/mock-data.ts` — in-memory mock data with simulated async delays; exports `fetchVideos`, `fetchVideoById`, `updateVideo`
- `src/lib/format.ts` — `formatDuration`, `formatDate`, `formatTime`, `timeAgo` helpers

### UI Components

`src/components/ui/` contains shadcn/ui components (Tailwind CSS v4, `class-variance-authority`). The path alias `@/` maps to `src/`.

### Testing

Tests use **Vitest** + **jsdom** + **@testing-library/react**. Test files are colocated with their feature (e.g., `VideoCard.test.tsx` next to `VideoCard.tsx`). Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`).
