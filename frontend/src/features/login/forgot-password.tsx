import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Form, Link, useActionData, useNavigation } from "react-router";

type ActionData =
    | { fieldErrors: Record<string, string> }
    | { formError: string }
    | { success: true };

/**
 * Forgot password page component.
 * Collects the user's email and requests a password reset link.
 */
export function ForgotPassword() {
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const fieldErrors = (actionData && "fieldErrors" in actionData ? actionData.fieldErrors : {}) ?? {};
    const success = actionData && "success" in actionData ? actionData.success : false;

    return (
        <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
            <Card className="w-full max-w-sm shadow-xl border-primary/10">
                <CardHeader className="space-y-3 text-center pb-6">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Forgot password
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-sm">
                            Enter your email and we'll send you a reset link.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <Alert className="py-3">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    If an account exists with that email, you'll receive a password reset link shortly.
                                </AlertDescription>
                            </Alert>
                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <Form noValidate method="post">
                            <FieldGroup>
                                {actionData && "formError" in actionData && actionData.formError && (
                                    <Alert variant="destructive" className="py-3">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">
                                            {actionData.formError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                    {fieldErrors.email && (
                                        <FieldError>{fieldErrors.email}</FieldError>
                                    )}
                                </Field>

                                <Field>
                                    <Button
                                        type="submit"
                                        className="w-full transition-all cursor-pointer"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : "Send reset link"}
                                    </Button>
                                </Field>

                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to login
                                </Link>
                            </FieldGroup>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
