# Reviews pagination: fix return-to-page-1 (VMP-172)

**Date:** 2026-07-14
**Linear:** [VMP-172](https://linear.app/next-consulting/issue/VMP-172)
**Scope:** Frontend only.

## Problem

On the reviews grid, once you advance past page 1 (`?page=2`), the **"< Previous"**
button and the **"1"** page-number button don't navigate back — the URL keeps
`page=2` and the list stays on page 2.

## Root cause

`buildPageHref` (`frontend/src/features/reviews/paginationUtils.ts`) builds a link's
href by mutating the current search params. For page 1 it deletes the `page` param.
When `page` was the *only* query param, the resulting search string is empty and the
function returns an empty string:

```ts
const search = params.toString();
return search ? `?${search}` : "";   // ← returns "" when nothing left
```

Per the HTML spec, `<a href="">` resolves to the **current** document URL *including
its query string*. So on `?page=2`, both the "Previous" and "1" controls render
`href=""`, which points right back at `?page=2` → no navigation. Because both controls
share this href, they fail together (matching the report).

### Confirmed scope (verified by code reading)

The bug is narrower than "any previous page":

- **Page 1, no other params** → returns `""` → **broken.**
- **Page N > 1** (e.g. 5→4, 3→2) → returns `?page=N` (non-empty) → **works.**
- **Page 1 with a filter active** (e.g. `?study=A&page=2`) → returns `?study=A`
  (non-empty) → **works.**

So the only failure is landing on page 1 from a state where `page` is the sole query
param.

## Fix

Change the empty-string branch to return a navigable value:

```ts
// before
return search ? `?${search}` : "";
// after
return search ? `?${search}` : "?";
```

`<a href="?">` resolves against the current URL by clearing the query string
(`/reviews?page=2` → `/reviews`), so page 1 loads and `page` is dropped — the expected
behavior. Every other branch is already correct and is left untouched.

- **Pure & testable:** no dependency on `window`/pathname; the util stays pure.
- **Cosmetic caveat:** the address bar may momentarily show a trailing `/reviews?`;
  browsers treat it identically to `/reviews` and the loader parses empty params →
  page 1.

## Testing

1. **`paginationUtils.test.ts`** — the existing case at line 33 currently asserts the
   buggy `""` for page 1 with no params. Flip it to assert `"?"` (non-empty,
   navigable, drops `page`). Other cases (filters-present → `?search=…`,
   page > 1 → `?page=N`) already pass and are unchanged.
2. **`ReviewPagination.test.tsx`** — add a regression test wiring the real
   `buildPageHref` with `searchParams="page=2"`, asserting the "Previous" button and
   the "1" link render a navigable href (`"?"`, not `""`). Locks the component + util
   together against regression.

## Out of scope

- Converting the plain `<a>` tags to React Router `<Link>` for client-side navigation
  (pagination currently full-reloads; still hits the loader correctly).
- Any backend/loader changes — the loader already handles an absent `page` correctly.
