import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function SignUp() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        await authClient.signUp.email(
            { email, password, name },
            {
                onSuccess: () => {
                    navigate("/");
                },
                onError: (ctx) => {
                    setError(ctx.error.message || "Sign up failed. Please try again.");
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
                        Create Account
                    </CardTitle>
                    <p className="text-sm text-text-muted">
                        Sign up for the Angelman Video Portal
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
                            <label htmlFor="name" className="text-sm font-medium text-text">
                                Full Name
                            </label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                        </div>
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
                                minLength={8}
                                disabled={isSubmitting}
                                className="bg-bg-dark border-border text-text"
                            />
                            <p className="text-xs text-text-muted">
                                Must be at least 8 characters
                            </p>
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !name || !email || !password}
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
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
