import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").pipe(z.email("Invalid email address")),
    password: z.string().min(1, "Password is required"),
});

/**
 * Route action for the login form.
 * Validates fields with Zod, then calls Better Auth's signIn.email endpoint.
 *
 * @param request - The form submission request
 * @returns Field errors, a form error, or a redirect to / on success
 */
export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = loginSchema.safeParse(data);

    if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return { fieldErrors: errors };
    }

    const { email, password } = result.data;

    const response = await authClient.signIn.email({
        email,
        password,
    });

    if (response.error) {
        return { formError: response.error.message ?? "Incorrect email or password. Please try again." };
    }

    return redirect("/");
}
