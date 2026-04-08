import { redirect } from "react-router";
import { authClient } from "@/lib/auth-client";

/**
 * Route loader that guards authenticated routes.
 * Redirects unauthenticated users to /login.
 *
 * @returns The session data, or a redirect to /login
 */
export async function authGuardLoader() {
    const { data: session } = await authClient.getSession();
    if (!session) return redirect("/login");
    return session;
}
