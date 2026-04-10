import { createAuthClient } from "better-auth/react";


/**
 * Better Auth client instance for the frontend.
 * Provides signIn, signOut, and useSession hooks.
 *
 * @description All auth API calls are proxied through Vite to the Express backend at /api/auth/*
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
});
