import { useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";

/**
 * @description Hook that returns a logout handler. Signs the user out via
 * Better Auth, then redirects to the login page.
 * @returns A function that logs the user out.
 */
export function useLogout() {
    const navigate = useNavigate();

    return async () => {
        await authClient.signOut();
        navigate("/login");
    };
}