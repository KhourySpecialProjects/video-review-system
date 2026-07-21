# User Edit Modal + Pencil Trigger — Design

## Problem
The admin user-edit UI is a right-side flyout (`UserSheet`, fixed `sm:max-w-md`). It is cramped, cannot be resized, and truncates long names, emails, and permission labels. Discovering how to edit a user is also unclear — the whole table row is the click target with no visible affordance.

## Goal
Replace the flyout with a roomier centered modal for the **Users tab only**, and add a pencil icon at the right end of each users-table row as the sole trigger for opening it. The modal has an explicit "Done" close and states that changes are saved automatically. No change to what is editable and no backend work.

## Existing State
- `frontend/src/features/admin/sheets/UserSheet.tsx` — the flyout. Applies every change immediately: Deactivate/Reactivate, add-permission, and delete-permission each fire a `useFetcher` mutation to `POST /admin` on click. No batched form, no Save button. Editable surface = status toggle + permissions; name/email/role are display-only.
- `frontend/src/features/admin/modals/InviteUserDialog.tsx` — existing modal pattern (`@/components/ui/dialog`, `DialogFooter`).
- `frontend/src/components/ui/dialog.tsx` — `DialogContent` defaults `sm:max-w-md`, renders its own top-right close `X` (`showCloseButton` default true), `DialogFooter` right-aligns on `sm+`. Exports `DialogDescription`.
- `frontend/src/features/admin/AdminDataTable.tsx` — generic table; entire row is clickable via `onRowClick`, with keyboard activation, skeleton rows, and empty-state colspan keyed on `columns.length`.
- `frontend/src/features/admin/TabContent.tsx` — generic; owns `selectedRow`/`sheetOpen`/`handleRowClick` and a `renderSheet` render prop. Shared by Users/Sites/Studies/Audit tabs.
- `frontend/src/routes/SystemAdminDashboard.tsx` — `UsersTab` wires `UserSheet` through `TabContent`.
- `frontend/src/features/admin/admin.route.ts` — `adminAction` exposes only `updateUserStatus`, `createPermission`, `deletePermission`. No name/email/role edit endpoint.

## Decisions
- **Save model:** immediate-apply (unchanged). Footer button is "Done" (no Save/Cancel). A `DialogDescription` line states changes are saved automatically.
- **Editable fields:** parity — status toggle + permissions only. No new backend endpoints.
- **Row trigger:** pencil-only on the Users tab; the row body is no longer clickable there.
- **Other tabs:** Sites/Studies/Audit keep their sheet + clickable-row behavior unchanged. All new table/tab props are optional and default to current behavior.
- **Linear:** one parent issue with two sub-issues (modal conversion; pencil trigger).

## Design
1. **`modals/EditUserDialog.tsx`** — port all of `UserSheet`'s hooks/state/handlers verbatim; swap only the shell from `Sheet*` to `Dialog*`. `DialogContent className="sm:max-w-lg"` (wider than the flyout's `md`), inner body `max-h-[70vh] overflow-y-auto`, `DialogTitle` "Edit User", `DialogDescription` "Changes are saved automatically.", footer `Button` "Done". Delete `UserSheet.tsx`; rewire `SystemAdminDashboard`.
2. **`AdminDataTable`** — add optional `onEditRow?: (row) => void` and `rowClickable?: boolean` (default true). When `onEditRow` set, append a trailing action column (header sr-only, cell = ghost `icon-sm` pencil `Button` with `stopPropagation`). Row interactivity (onClick/onKeyDown/tabIndex/cursor-pointer) gated on `rowClickable`. Empty-state colspan and skeleton column count use `columns.length + (hasActions ? 1 : 0)`.
3. **`TabContent`** — add optional `rowClickable` (default true) and `showEditAction` (default false); pass `rowClickable` and `onEditRow={showEditAction ? handleRowClick : undefined}` to the table. Reuse existing `handleRowClick`.
4. **`UsersTab`** — pass `rowClickable={false}` and `showEditAction`.

## Testing
- `frontend`: `npm run build` (`tsc -b && vite build`), `npm run lint`, `npm run test` all green.
- Manual smoke (SYSADMIN → admin → Users): pencil at row end is the only trigger; modal opens centered, wider, untruncated, with "Edit User", the instant-save note, top-right X, and Done; Deactivate/Reactivate, add-permission, delete-permission all apply immediately; Done/X/overlay close; Sites/Studies rows still clickable (regression check).

## Non-Goals
- Editing name, email, or role (no such backend endpoint).
- Batched/deferred save with a real Save button.
- Changing Sites/Studies/Audit tab interaction.
- Any backend/API changes.
