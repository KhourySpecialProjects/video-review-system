import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").pipe(z.email("Invalid email address")),
    password: z.string().min(1, "Password is required"),
});

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

    // Below is the mock implementation for checking credentials.
    // Replace the block below with an actual API call.
    if (data.password === "wrong") {
        return { formError: "Incorrect email or password. Please try again." };
    }

    return redirect("/");
}
