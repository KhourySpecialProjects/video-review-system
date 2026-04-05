import { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router";

/**
 * Zod schema for validating the login form input.
 * Ensures that both email and password are provided and that the email format is correct.
 */
const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

/**
 * Custom hook that manages the logic, state, and submissions for the login form.
 * It handles input validation, tracking submission status, managing errors, and redirecting on success.
 */
export function useLogin() {
    // State to track if the form is currently being submitted
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State to track validation errors for individual fields (e.g. { email: "Invalid email" })
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // State to track general form-level errors (e.g. "Wrong password", "Server error")
    const [formError, setFormError] = useState<string>();

    const navigate = useNavigate();

    /**
     * Handles the form submission event.
     * Prevents default browser submission, extracts form data, validates it
     */
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFieldErrors({});
        setFormError(undefined);

        // Extract values directly from the DOM form element
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        // Validate the extracted data against our Zod schema
        const result = loginSchema.safeParse(data);

        // If validation fails, extract the error messages and update the UI
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                if (issue.path[0]) {
                    errors[issue.path[0].toString()] = issue.message;
                }
            });
            setFieldErrors(errors);
            setIsSubmitting(false);
            return;
        }

        // Below is the mock implementation for checking credentials.
        // Replace the block below with an actual API call.

        // Mock login check
        // For demonstration, let's say typing "wrong" as password triggers an error.
        if (data.password === "wrong") {
            setFormError("Incorrect email or password. Please try again.");
            setIsSubmitting(false);
            return;
        }

        // On success, redirect to the caregiver dashboard (currently root '/')
        navigate("/");
    };

    return {
        isSubmitting,
        fieldErrors,
        formError,
        handleSubmit
    };
}
