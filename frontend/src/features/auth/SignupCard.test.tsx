import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { SignupForm } from "./SignupCard";
import type { SignupActionData } from "./signup.types";

let mockActionData: SignupActionData | undefined;
let mockNavigationState: string;

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useActionData: () => mockActionData,
    useNavigation: () => ({ state: mockNavigationState }),
  };
});

/**
 * Wraps SignupForm in a minimal router so <Form> renders without errors.
 *
 * @param actionData - Optional action data to simulate returned errors
 * @param navigationState - Navigation state string (default "idle")
 */
function renderSignupForm(
  actionData?: SignupActionData,
  navigationState = "idle",
) {
  mockActionData = actionData;
  mockNavigationState = navigationState;

  const router = createMemoryRouter(
    [{ path: "/", element: <SignupForm /> }],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("SignupForm", () => {
  it("renders all form fields and the submit button", () => {
    renderSignupForm();

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeInTheDocument();
  });

  it("displays a server error banner when actionData has an error", () => {
    renderSignupForm({ error: "Email already registered" });

    expect(screen.getByText("Email already registered")).toBeInTheDocument();
  });

  it("displays field errors for name and email", () => {
    renderSignupForm({
      fieldErrors: {
        name: "Name is required",
        email: "Invalid email address",
      },
    });

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("displays field errors for password and confirmPassword", () => {
    renderSignupForm({
      fieldErrors: {
        password: "Password must be at least 8 characters",
        confirmPassword: "Passwords do not match",
      },
    });

    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("does not display errors when actionData is undefined", () => {
    renderSignupForm();

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Invalid email address"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Password must be at least 8 characters"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Passwords do not match"),
    ).not.toBeInTheDocument();
  });

  it("disables the submit button and shows loading text while submitting", () => {
    renderSignupForm(undefined, "submitting");

    const button = screen.getByRole("button", { name: "Creating Account..." });
    expect(button).toBeDisabled();
  });

  it("enables the submit button when idle", () => {
    renderSignupForm();

    const button = screen.getByRole("button", { name: "Create Account" });
    expect(button).toBeEnabled();
  });

  it("renders the sign-in link and legal text", () => {
    renderSignupForm();

    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("applies a custom className to the wrapper div", () => {
    mockActionData = undefined;
    mockNavigationState = "idle";

    const router = createMemoryRouter(
      [{ path: "/", element: <SignupForm className="custom-class" /> }],
      { initialEntries: ["/"] },
    );

    const { container } = render(<RouterProvider router={router} />);
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});
