# GlitchTip telemetry + in-app feedback — design

**Date:** 2026-07-16
**Status:** Approved (brainstorming) — ready for implementation planning
**Related:** [[coolify-next-deployment]], [[coolify-develop-deployment]], `docker-compose.coolify.yml`

> **Update (2026-07-16, during local testing):** the **optional screenshot was
> dropped** from the feedback widget. GlitchTip returns HTTP 500 on the envelope's
> attachment item — it ingests the feedback event but rejects the attached image
> (attachment support is a known GlitchTip gap). Rather than run extra storage for
> a feature GlitchTip won't honor, feedback now carries only the message + type +
> route + auto-attached breadcrumb trail. Screenshot references below are
> superseded; `html2canvas-pro` was removed.

## Goal

Give the team the observability and tester-feedback tooling needed to **fix bugs during the testing phase**, keeping everything self-hosted and internal to the app + deployment (no PostHog or other SaaS). Two cooperating capabilities:

1. **Telemetry** — capture frontend and backend errors with enough context (a breadcrumb trail of what the user was doing) to reproduce and fix them.
2. **In-app feedback** — an unobtrusive floating widget on every page that lets testers send specific feedback, automatically carrying the app context (route, role, environment, recent actions).

Both flow into a single self-hosted **GlitchTip** instance for triage. When a GlitchTip issue earns a ticket, the operator manually creates a Linear issue and cross-links the two.

## Non-goals

- **No session replay / video.** Breadcrumb trails only. (GlitchTip does not ingest replays; adding it would mean a second tool, more storage, and a larger PHI surface — explicitly rejected.)
- **No automatic feedback → Linear pipeline.** Feedback is triaged in GlitchTip first; promotion to Linear is a deliberate manual step. (Rejected the "straight to Linear" flow.)
- **No product analytics** (funnels, heatmaps, retention). The north star is bug-fixing, not growth metrics.
- **No changes to the Asclepion data model.** See "Data-model impact" below — this is a hard constraint.

## Key decisions (from brainstorming)

| # | Decision | Rationale |
|---|---|---|
| 1 | **Breadcrumbs only**, no replay | Smallest infra + privacy surface; GlitchTip covers it natively |
| 2 | **All feedback lands in GlitchTip**, triaged there, manually promoted to Linear | One inbox; app context attaches for free via the SDK; avoids GlitchTip's weak native Linear integration |
| 3 | **One GlitchTip project per environment** (`asclepion-next`, `asclepion-dev`), with `platform:frontend\|backend` tags | Triage unit matches the two Coolify resources one-to-one; tags still allow slicing by side |
| 4 | **Max data now, env-switchable to private later** | `next`/`dev` hold no real PII during testing; production must dial identity/scrubbing down |
| 5 | **Feedback affordance = right-edge vertical tab** → slide-in panel | Most unmistakably "feedback," stays out of the content, won't fight corner toasts/menus |
| 6 | **Structured panel:** Type toggle (Bug / Confusing / Idea) + message + visible "auto-attached" context | Type toggle drives fast GlitchTip triage; visible context builds tester trust and confirms capture is working |

## Architecture

Three code pieces in the existing app repo, plus one new standalone deployment.

### Components

- **GlitchTip deployment** — a **new, separate Coolify "Docker Compose" resource**: GlitchTip web + worker (celery beat + worker) + its own Postgres + Redis. It is independent of the Asclepion app and has its own database and volumes. Exposed at a dedicated domain (e.g. `glitchtip.cs4535.cloud`). Both the `next` and `dev` Asclepion deployments send to this one instance. Two projects are created in the GlitchTip UI — `asclepion-next` and `asclepion-dev` — each yielding a DSN.

- **Frontend telemetry** (`@sentry/react`) — GlitchTip is Sentry-protocol compatible, so the official Sentry React SDK is the client. Initialized in `frontend/src/main.tsx`. Captures uncaught errors and a breadcrumb trail (console, DOM clicks, `fetch`/`xhr`, route navigations). Sets user context and `environment`/`release` tags. Performance tracing is disabled — breadcrumbs and errors only.

- **Feedback widget** — a new React component mounted once at the app root (so it renders on every route). Renders the right-edge tab and the slide-in panel (decision #5/#6). On submit it calls the Sentry SDK to send the feedback as a message event (see data flow). Lives under `frontend/src/components/`.

- **Backend telemetry** (`@sentry/node`) — initialized in `backend/src/index.ts` and wired into the Express 5 error-handling middleware (`backend/src/middleware/errors.ts`) so unhandled errors are captured with request context and the `environment` tag.

### Data flow

**Error path:** a JS exception (frontend) or an unhandled error / 500 (backend) → the SDK captures it with the current breadcrumb trail + `environment` + `platform` tags → the matching GlitchTip project (`asclepion-next` or `asclepion-dev`) → operator triage.

**Feedback path:** tester clicks the edge tab → fills the panel (type, message) → the widget opens a scope, sets the feedback tags + route context explicitly, and sends an info-level message:

```
Sentry.withScope((scope) => {
  scope.setTag('feedback', true)
  scope.setTag('feedback.type', type)                 // bug | confusing | idea
  scope.setContext('feedback', { route })             // parametrized in scrubbed mode
  Sentry.captureMessage(message, 'info')
})
```

The SDK **automatically attaches the live breadcrumb buffer and the user context**; the **route is set explicitly** on the scope (above). This is why the widget lives in the frontend and sends directly, with **no backend endpoint and nothing persisted in the Asclepion database**. The feedback appears as an ordinary GlitchTip issue (tagged `feedback`) alongside errors.

**Triage → Linear (manual):** the operator works through GlitchTip. When an issue earns a ticket, they create the Linear issue (Velocity Consultants) and cross-link: paste the GlitchTip issue URL onto the Linear issue as a link/attachment, and drop the Linear issue URL back onto the GlitchTip issue. Two clicks, bidirectional, unambiguous.

### Privacy switch

A single conceptual setting, `TELEMETRY_PRIVACY` ∈ { `full`, `scrubbed` }, governs how much identifiable data enters GlitchTip:

| Aspect | `full` (next / dev) | `scrubbed` (production / main, later) |
|---|---|---|
| User identity on events | id + email + role | id + role only |
| Breadcrumb URLs | captured as-is | parametrized (`/videos/abc` → `/videos/:id`) |
| Input values | captured | masked |

Wiring:

- **Frontend** reads it as a **build arg** `VITE_TELEMETRY_PRIVACY` — Vite bakes env at build time, so it must be a build variable (identical mechanism and caveat to the existing `VITE_APP_ENV`). It also drives whether `beforeSend` / `beforeBreadcrumb` scrubbers run.
- **Backend** reads `TELEMETRY_PRIVACY` at **runtime** from the service environment.
- **Code default is `scrubbed`.** An unset/empty value must fail *private*, not leaky — mirroring the existing "unset secret is a silent hole, fail safe" posture in `docker-compose.coolify.yml`.

For this phase, `next` and `dev` are built/run with `full`.

### Deployment wiring (`docker-compose.coolify.yml`)

- **`frontend` service** gains two **build args**: `VITE_GLITCHTIP_DSN` and `VITE_TELEMETRY_PRIVACY` (alongside the existing `VITE_APP_ENV`). In Coolify these MUST be marked **build** variables.
- **`backend` service** gains two **runtime env** vars: `SENTRY_DSN` and `TELEMETRY_PRIVACY`.
- The GlitchTip instance itself is **NOT** part of this compose file — it is a separate Coolify resource stood up once by the operator.
- `.env.coolify.example` and `.env.coolify.next.example` gain the new variables (with the DSN blank / commented and privacy defaulting to the safe value), plus a short README note.

## Error handling & safety

- SDK initialization is **fire-and-forget and non-blocking**. An **empty DSN makes the SDK a no-op**, so local development and any environment without GlitchTip run clean with telemetry simply off.
- If GlitchTip is unreachable, the SDK queues/drops events silently — it must never break the app or block a tester.
- Widget submit is optimistic (immediate "thanks" toast). A failed send is swallowed (the SDK retries/queues); the tester is never blocked.

## Data-model impact

**None.** No Prisma schema edits, no new migrations, no new tables or columns in the `angelman` database. Feedback is sent frontend → GlitchTip directly with no persistence in Asclepion; GlitchTip stores everything in its own separate Postgres. This keeps the work clean under the forward-only migration discipline (`next → develop → main`): nothing here can strand a database ahead of its schema.

> Caveat that keeps this true: it holds **because** feedback lives in GlitchTip (decision #2). Introducing an in-app feedback console (the rejected Option B) would add a `feedback` table = a migration. As designed, there is no migration.

## Testing strategy

- **Frontend unit tests** (mock the Sentry SDK): the widget renders the tab, opens the panel, requires a non-empty message, and calls `captureMessage` with the correct `feedback` / `feedback.type` tags; the privacy scrubbers (URL parametrizer, input mask) tested as pure functions in both modes.
- **Backend unit tests**: the error middleware forwards captured errors to the SDK (mocked); the scrubber runs in `scrubbed` mode and not in `full`.
- **Manual smoke test** (on `next`): trigger a deliberate frontend error and submit a test feedback; confirm both appear in the `asclepion-next` GlitchTip project with an intact breadcrumb trail and correct tags.

## Scope & phasing

Single spec; the implementation plan stages it so value lands early:

1. **Phase 1 (the meat):** stand up the GlitchTip Coolify resource (operator step), add frontend error telemetry, and build the feedback widget.
2. **Phase 2:** add backend error telemetry.

This becomes one Linear ticket (Velocity Consultants), branched off `next` per the standard workflow.

## Operator step (one-time, outside the app repo)

Stand up the GlitchTip Coolify resource: create the Docker Compose resource (GlitchTip web + worker + Postgres + Redis), point a domain at it, create the `asclepion-next` and `asclepion-dev` projects, and copy each DSN into the corresponding Asclepion deployment's telemetry variables. This mirrors how the `next` resource was stood up and is done in the Coolify UI, not in code.
