import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z
    .object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

/**
 * Route action for the reset password form.
 * Validates the new password, then calls Better Auth's resetPassword endpoint.
 *
 * @param request - The form submission request
 * @returns Field errors, a form error, or a redirect to /login on success
 */
export async function clientAction({ request }: ActionFunctionArgs) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
        return { formError: "Missing reset token. Please request a new password reset link." };
    }

    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = resetPasswordSchema.safeParse(data);

    if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return { fieldErrors: errors };
    }

    const { newPassword } = result.data;

    const response = await authClient.resetPassword({
        newPassword,
        token,
    });

    if (response.error) {
        return { formError: response.error.message ?? "Failed to reset password. The link may have expired." };
    }

    return redirect("/login");
}
