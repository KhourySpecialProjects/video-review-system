import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Form, useActionData, useNavigation } from "react-router";

type ActionData =
    | { fieldErrors: Record<string, string> }
    | { formError: string };

/**
 * Reset password page component.
 * Collects a new password after the user clicks the reset link from their email.
 */
export function ResetPassword() {
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const fieldErrors = (actionData && "fieldErrors" in actionData ? actionData.fieldErrors : {}) ?? {};
    const formError = actionData && "formError" in actionData ? actionData.formError : undefined;

    return (
        <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
            <Card className="w-full max-w-sm shadow-xl border-primary/10">
                <CardHeader className="space-y-3 text-center pb-6">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Reset password
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-sm">
                            Enter your new password below.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <Form noValidate method="post">
                        <FieldGroup>
                            {formError && (
                                <Alert variant="destructive" className="py-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        {formError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Field>
                                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                />
                                {fieldErrors.newPassword && (
                                    <FieldError>{fieldErrors.newPassword}</FieldError>
                                )}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                />
                                {fieldErrors.confirmPassword && (
                                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                                )}
                                <FieldDescription>
                                    Must be at least 8 characters long.
                                </FieldDescription>
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
                                            Resetting...
                                        </>
                                    ) : "Reset password"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
