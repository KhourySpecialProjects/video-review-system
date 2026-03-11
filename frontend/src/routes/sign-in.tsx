import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function SignIn() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        await authClient.signIn.email(
            { email, password },
            {
                onSuccess: () => {
                    navigate("/");
                },
                onError: (ctx) => {
                    setError(ctx.error.message || "Sign in failed. Please try again.");
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg-dark px-4">
            <Card className="w-full max-w-md border-border bg-bg-light shadow-l">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
                        CV
                    </div>
                    <CardTitle className="text-2xl font-bold text-text">
                        Welcome Back
                    </CardTitle>
                    <p className="text-sm text-text-muted">
                        Sign in to the Angelman Video Portal
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {error && (
                            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-text">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-text">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !email || !password}
                            className="w-full gap-2"
                        >
                            {isSubmitting && <Spinner className="size-4" />}
                            {isSubmitting ? "Signing in..." : "Sign In"}
                        </Button>
                        <p className="text-center text-sm text-text-muted">
                            Don't have an account?{" "}
                            <Link to="/sign-up" className="font-medium text-primary hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
