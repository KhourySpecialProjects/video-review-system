import { type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
    email: z.string().min(1, "Email is required").pipe(z.email("Invalid email address")),
});

/**
 * Route action for the forgot password form.
 * Validates the email, then calls Better Auth's forgetPassword endpoint.
 * Always returns success to avoid leaking whether an email exists.
 *
 * @param request - The form submission request
 * @returns Field errors or a success flag
 */
export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = forgotPasswordSchema.safeParse(data);

    if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return { fieldErrors: errors };
    }

    const { email } = result.data;
    const redirectTo = `${window.location.origin}/reset-password`;

    try {
        await authClient.requestPasswordReset({
            email,
            redirectTo,
        });
    } catch {
        // Swallow errors to prevent email enumeration
    }

    // Always show success to avoid email enumeration
    return { success: true };
}
