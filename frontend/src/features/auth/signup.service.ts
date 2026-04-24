import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import {
  signupFormSchema,
  type SignupActionData,
  type SignupFieldErrors,
  type SignupLoaderData,
} from "./signup.types";
import { apiFetch } from "@/lib/api";

/**
 * Validates raw form data against the signup schema.
 * Returns field-level errors keyed by field name, or null if valid.
 *
 * @param data - Raw key/value pairs from FormData
 * @returns Field errors object, or null when validation passes
 */
export function validateSignupForm(
  data: Record<string, FormDataEntryValue>,
): SignupFieldErrors | null {
  const result = signupFormSchema.safeParse(data);
  if (result.success) return null;

  const errors: SignupFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0]?.toString() as keyof SignupFieldErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Route loader — extracts the invite token from the URL for the signup form.
 *
 * @param params - Route params containing the invite token
 * @returns The invite token and an empty email for the form
 * @throws {Response} 400 if the token param is missing
 */
export async function signupLoader({
  params,
}: LoaderFunctionArgs): Promise<SignupLoaderData> {
  const token = params.token;
  if (!token) throw new Response("Missing invite token", { status: 400 });

  return { email: "", token };
}

/**
 * Route action — validates the signup form and activates the account.
 * Returns field-level errors on validation failure, a server error message
 * on backend failure, or redirects to /login on success.
 *
 * @param request - The form submission request
 * @param params - Route params containing the invite token
 * @returns Action data with errors, or a redirect to /login on success
 */
export async function signupAction({
  request,
  params,
}: ActionFunctionArgs): Promise<SignupActionData | Response> {
  const token = params.token;
  if (!token) throw new Response("Missing invite token", { status: 400 });

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  const fieldErrors = validateSignupForm(raw);
  if (fieldErrors) return { fieldErrors };

  const parsed = signupFormSchema.parse(raw);

  const response = await apiFetch("/auth/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      error: body?.message ?? "Something went wrong. Please try again.",
    };
  }

  return redirect("/login");
}
