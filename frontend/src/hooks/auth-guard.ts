import { redirect } from "react-router";
import type { Role } from "@shared/auth";
import { authClient } from "@/lib/auth-client";

/**
 * @description Route loader that guards authenticated routes.
 * Redirects unauthenticated users to `/login`.
 *
 * @returns The session data, or a redirect to `/login`
 */
export async function authGuardLoader() {
    const { data: session } = await authClient.getSession();
    if (!session) return redirect("/login");
    return session;
}

/**
 * @description Reads the role off the current session. Assumes the
 * session has already been fetched by the top-level `authGuardLoader` —
 * role guards below are always mounted under it.
 *
 * @returns The authenticated user's role, or `null` if the session or
 *   role claim is missing.
 */
async function getSessionRole(): Promise<Role | null> {
    const { data: session } = await authClient.getSession();
    if (!session) return null;
    const role = (session.user as { role?: Role }).role;
    return role ?? null;
}

/**
 * @description Role guard that only lets `CAREGIVER` users through.
 * Non-caregiver authenticated users are sent to `/reviews`, the landing
 * page for reviewers/coordinators/sysadmins. Unauthenticated users hit
 * the outer auth guard and end up at `/login` instead.
 *
 * @returns `null` on success, or a redirect response when the role is
 *   wrong.
 */
export async function caregiverGuardLoader() {
    const role = await getSessionRole();
    if (!role) return redirect("/login");
    if (role !== "CAREGIVER") return redirect("/reviews");
    return null;
}

/**
 * @description Role guard that blocks `CAREGIVER` users and allows every
 * other role (`CLINICAL_REVIEWER`, `SITE_COORDINATOR`, `SYSADMIN`).
 * Caregivers are sent back to `/`, their home dashboard.
 *
 * @returns `null` on success, or a redirect response when the role is
 *   wrong.
 */
export async function nonCaregiverGuardLoader() {
    const role = await getSessionRole();
    if (!role) return redirect("/login");
    if (role === "CAREGIVER") return redirect("/");
    return null;
}
