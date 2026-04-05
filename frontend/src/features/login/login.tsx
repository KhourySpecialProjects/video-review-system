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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLogin } from "@/hooks/use-login";

/**
 * Login Component
 * 
 * Renders the primary user interface for authentication.
 */

export function Login() {
    // Destructure state and actions from the login hook
    const { isSubmitting, fieldErrors, formError, handleSubmit } = useLogin();

    return (
        // Main container to center the login card vertically and horizontally
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
                    {/* 
            The form element triggers the submit handler defined in `useLogin`. 
            This handles both preventing default refresh and triggering validation.
          */}
                    <form onSubmit={handleSubmit} className="space-y-4">

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
                                // Apply a red border dynamically if there is an email validation error
                                className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {/* Display specific email error messages */}
                            {fieldErrors.email && (
                                <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password Input Group */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>

                                {/* Link this to the actual password reset route when implemented.
                    Example: <Link to="/forgot-password" ... >Forgot password?</Link>
                */}
                                <a href="#" className="text-xs font-medium text-primary hover:underline">
                                    Forgot password?
                                </a>
                            </div>

                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                // Apply a red border dynamically if there is a password validation error
                                className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {/* Display specific password error messages */}
                            {fieldErrors.password && (
                                <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Submit Button. Disabled and updates text while request is processing. */}
                        <Button
                            type="submit"
                            className="w-full mt-2 transition-all"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Logging in..." : "Log in"}
                        </Button>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
