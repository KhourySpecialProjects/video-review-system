import { z } from "zod";

/**
 * Zod schema for the signup form fields.
 * Validates name, email, password, and confirms passwords match.
 *
 * @property name - Trimmed, non-empty display name
 * @property email - Valid email, normalized to lowercase
 * @property password - Minimum 8 characters
 * @property confirmPassword - Must match password
 */
export const signupFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Validated signup form data after Zod parsing.
 */
export type SignupFormData = z.infer<typeof signupFormSchema>;

/**
 * Shape of field-level validation errors returned from the action.
 */
export type SignupFieldErrors = Partial<Record<keyof SignupFormData, string>>;

/**
 * Data returned by the signup action to the component.
 */
export type SignupActionData = {
  fieldErrors?: SignupFieldErrors;
  error?: string;
};

/**
 * Data returned by the signup loader to the component.
 */
export type SignupLoaderData = {
  email: string;
  token: string;
};
