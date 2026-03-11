import { Link, Form, redirect, useActionData, useNavigation } from "react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
});

type ActionData = {
    error?: string;
    fieldErrors?: Record<string, string>;
};

export async function clientAction({ request }: { request: Request }): Promise<ActionData | Response> {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = signUpSchema.safeParse(data);
    if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return { fieldErrors: errors };
    }

    const { error } = await authClient.signUp.email({
        email: result.data.email,
        password: result.data.password,
        name: result.data.name as string,
    });

    if (error) {
        return { error: error.message || "Sign up failed. Please try again." };
    }

    return redirect("/");
}

export default function SignUp() {
    const actionData = useActionData() as ActionData | undefined;
    const navigation = useNavigation();
    const isSubmitting = navigation.state !== "idle";

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg-dark px-4">
            <Card className="w-full max-w-md border-border bg-bg-light shadow-l">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
                        CV
                    </div>
                    <CardTitle className="text-2xl font-bold text-text">
                        Create Account
                    </CardTitle>
                    <p className="text-sm text-text-muted">
                        Sign up for the Angelman Video Portal
                    </p>
                </CardHeader>
                <CardContent>
                    <Form method="post" className="flex flex-col gap-4">
                        {actionData?.error && (
                            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {actionData.error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-text">
                                Full Name
                            </label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                            {actionData?.fieldErrors?.name && <p className="text-xs text-destructive">{actionData.fieldErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-text">
                                Email
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                            {actionData?.fieldErrors?.email && <p className="text-xs text-destructive">{actionData.fieldErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-text">
                                Password
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                minLength={8}
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                            {actionData?.fieldErrors?.password && <p className="text-xs text-destructive">{actionData.fieldErrors.password}</p>}
                            {!actionData?.fieldErrors?.password && (
                                <p className="text-xs text-text-muted">
                                    Must be at least 8 characters
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full gap-2"
                        >
                            {isSubmitting && <Spinner className="size-4" />}
                            {isSubmitting ? "Creating account..." : "Create Account"}
                        </Button>
                        <p className="text-center text-sm text-text-muted">
                            Already have an account?{" "}
                            <Link to="/sign-in" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
