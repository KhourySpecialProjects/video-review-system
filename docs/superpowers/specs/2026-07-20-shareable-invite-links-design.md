# VMP-189 — Shareable invite links (copyable signup URL in the invite dialog)

**Linear:** [VMP-189](https://linear.app/aiil/issue/VMP-189)
**Date:** 2026-07-20
**Status:** Approved
**Surface:** Backend (2 line-level edits) + Frontend (invite dialog). **No data-model change.**

## Problem

Testers can't invite each other unless email delivery works, and the emitted
signup link is built from a single fixed `FRONTEND_URL` (`backend/src/lib/ses.ts:69-70`).
Testers running on different (fake) hosts therefore can't share a working link.

We want the person creating an invite to get a **copyable signup URL** directly in
the UI — one that points at *their own* host — without setting up email and without
removing the existing email path.

## Goal

When an admin / site-coordinator creates an invite, the invite dialog shows a
copyable `/signup/:token` URL that targets the inviter's current origin, alongside
an "expires in 5 days" note. Email still fires unchanged. **The `Invitation` model
is not touched.**

## Why this is small

The token infrastructure already exists end to end:

- `createInvite` already generates a `crypto.randomBytes(32)` token and returns it —
  but only when `NODE_ENV !== "production"` (`backend/src/domains/auth/auth.service.ts:40,78`).
- The frontend already has the matching landing route `/signup/:token`
  (`frontend/src/router.tsx:169-174`) and activation flow.
- The email already builds `${FRONTEND_URL}/signup/${token}` (`backend/src/lib/ses.ts:70`).

So "generate a shareable URL" reduces to: stop hiding the token, build the URL on
the client from the current origin, and show it in the dialog.

## Design

### Part 1 — Backend (no schema change)

`backend/src/domains/auth/auth.service.ts`:

1. **Expiry `24h → 5 days`** (`auth.service.ts:50`):
   `new Date(Date.now() + 24 * 60 * 60 * 1000)` →
   `new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)`.
   The `expiresAt` column already stores this — no migration. 5 days is within
   industry norm (GitHub/GitLab invites are 7 days). Prefer a named constant, e.g.
   `const INVITE_TTL_MS = 5 * 24 * 60 * 60 * 1000;`.

2. **Return `token` on all environments** (`auth.service.ts:73-79`): drop the
   `...(process.env.NODE_ENV !== "production" && { token })` gate so the response
   always includes `token`. `id`, `createdAt`, and `expiresAt` are already returned.

`sendInviteEmail` / the SES path and the `Invitation` Prisma model are **untouched**.

#### Exposure note (accepted)

In production the token previously reached only the invitee's inbox; it now also
reaches the *inviter* (an admin / site-coordinator) in the API response. That is the
intent — they are the party delivering the link, matching the Slack/Notion "copy
invite link" model. Mitigated by: single-use claim, 5-day expiry, and the invitee
still setting a password on activation. Accepted.

### Part 2 — URL construction (client-side)

The frontend builds the link from `window.location.origin`, **not** `FRONTEND_URL` —
the same pattern the password-reset flow already uses
(`frontend/src/hooks/use-forgot-password.ts:34`):

```ts
const signupUrl = `${window.location.origin}/signup/${token}`;
```

Because the origin is the inviter's live browser origin, the link always targets the
host they are on. This is what solves the multi-domain tester problem. The email path
keeps using the backend `FRONTEND_URL` and is irrelevant to the copy-link flow.

### Part 3 — Pass the token through the invite action

`frontend/src/features/admin/invite.route.ts:33-47`: the action currently POSTs to
`/auth/invite`, invalidates `adminKeys.all`, toasts `"Invitation sent successfully"`,
and returns `{ ok: true }`.

Change it to return the `token` (and `expiresAt`) from the response so the dialog can
render the link, e.g. `return { ok: true, token, expiresAt }`. **Keep** the query
invalidation. **Drop** the success toast — the in-dialog link view replaces it.
Error handling is unchanged (see Part 5).

### Part 4 — Dialog state machine (`InviteUserDialog.tsx`)

The dialog gains two explicit states:

- **Form** (current): email / role / site → submit. Unchanged fields and validation.
- **Link ready** (new): replaces the form once the action returns success with a
  token. Contains:
  - a read-only URL field showing `signupUrl` (built per Part 2),
  - a **Copy** button that writes `signupUrl` to the clipboard and shows a transient
    "Copied!" confirmation,
  - an **"Expires in 5 days"** line (static copy; the concrete `expiresAt` is
    available if we later want an exact date),
  - **Invite another** → reset the fetcher/dialog back to a clean Form state,
  - **Done** → close the dialog.

The transition is driven by the `useFetcher` result: when `fetcher.data?.token` is
present, render the Link-ready view; otherwise render the Form.

### Part 5 — Error handling (unchanged)

Validation / permission failures (e.g. a site-coordinator inviting a disallowed role,
or an invalid site) still return non-2xx and surface via the existing
`toast.error(body.error ...)` with the form left open and editable. The Link-ready
view is only reached on a 200 that carries a token.

## Testing

- **Backend** (`auth.service` / SES unit tests):
  - `createInvite` response includes `token` regardless of `NODE_ENV`
    (assert for both `"production"` and non-production).
  - `expiresAt` is ≈ 5 days out (within a tolerance of the call time).
  - Email is still sent (existing `sendInviteEmail` assertion unchanged).
- **Frontend** (`InviteUserDialog` component test):
  - Successful submit (action returns a token) transitions Form → Link-ready and
    renders `${origin}/signup/<token>`.
  - Copy button writes the URL to the clipboard (mock `navigator.clipboard`) and
    shows the "Copied!" state.
  - "Invite another" returns to a clean Form.
  - An error response keeps the Form open and toasts the error (no link view).

## Out of scope / known tradeoff

- **Copy-once by design.** Only the token *hash* is stored (`Invitation.tokenHash`),
  so the link can be shown *only* at creation time — there is no "view link again
  later." Recovering it would require storing the raw token, a schema change we are
  deliberately avoiding (and a security downgrade). Re-inviting mints a fresh link.
  Acceptable for the testing use case.
- No change to the email template, `FRONTEND_URL`, or the `Invitation` schema.
- No "resend invite" / invite-list affordance.
