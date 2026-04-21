import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Form, Link, useActionData, useNavigation } from "react-router";

type ActionData =
    | { fieldErrors: Record<string, string> }
    | { formError: string };

export function Login() {
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
                        <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
                        <CardDescription className="text-muted-foreground text-sm">
                            Please sign in to your dashboard.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <Form noValidate method="post" className="space-y-4">

                        {/* Conditional rendering for general/server-side errors */}
                        {formError && (
                            <Alert variant="destructive" className="py-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    {formError}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Email Input Group */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                autoComplete="email"
                                className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {fieldErrors.email && (
                                <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password Input Group */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>

                                <Button
                                    variant="link"
                                    size="xs"
                                    nativeButton={false}
                                    render={<Link to="/forgot-password" />}
                                >
                                    Forgot password?
                                </Button>
                            </div>

                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {fieldErrors.password && (
                                <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Remember Me checkbox. When checked, Better Auth issues a persistent session cookie. */}
                        <div className="flex items-center gap-2">
                            <Checkbox id="rememberMe" name="rememberMe" defaultChecked />
                            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                                Remember me
                            </Label>
                        </div>

                        {/* Submit Button. Disabled and updates text while request is processing. */}
                        <Button
                            type="submit"
                            className="w-full mt-2 transition-all cursor-pointer"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Logging in...
                                </>
                            ) : "Log in"}
                        </Button>

                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
