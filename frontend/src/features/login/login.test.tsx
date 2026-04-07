import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Login } from "./login";
import * as ReactRouter from "react-router";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useActionData: vi.fn(),
    useNavigation: vi.fn(),
  };
});

const mockUseActionData = vi.mocked(ReactRouter.useActionData);
const mockUseNavigation = vi.mocked(ReactRouter.useNavigation);

const idleNavigation = { state: "idle" } as ReturnType<typeof ReactRouter.useNavigation>;
const submittingNavigation = { state: "submitting" } as ReturnType<typeof ReactRouter.useNavigation>;

beforeEach(() => {
  vi.resetAllMocks();
  mockUseActionData.mockReturnValue(undefined);
  mockUseNavigation.mockReturnValue(idleNavigation);
});

function renderLogin() {
  const router = createMemoryRouter([
    { path: "/", element: <Login />, action: async () => null },
  ]);
  return render(<RouterProvider router={router} />);
}

describe("Login", () => {
  it("renders the login form with email and password fields", () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("renders heading and description", () => {
    renderLogin();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows 'Logging in...' and disables button while submitting", () => {
    mockUseNavigation.mockReturnValue(submittingNavigation);
    renderLogin();
    const button = screen.getByRole("button", { name: /logging in/i });
    expect(button).toBeDisabled();
  });

  it("button is enabled when not submitting", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /log in/i })).not.toBeDisabled();
  });

  it("displays form-level error alert", () => {
    mockUseActionData.mockReturnValue({ formError: "Incorrect email or password. Please try again." });
    renderLogin();
    expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
  });

  it("does not show error alert when there is no form error", () => {
    renderLogin();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays email field error", () => {
    mockUseActionData.mockReturnValue({ fieldErrors: { email: "Invalid email address" } });
    renderLogin();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("displays password field error", () => {
    mockUseActionData.mockReturnValue({ fieldErrors: { password: "Password is required" } });
    renderLogin();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("applies destructive style to email input when there is an email error", () => {
    mockUseActionData.mockReturnValue({ fieldErrors: { email: "Invalid email address" } });
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toHaveClass("border-destructive");
  });

  it("applies destructive style to password input when there is a password error", () => {
    mockUseActionData.mockReturnValue({ fieldErrors: { password: "Password is required" } });
    renderLogin();
    expect(screen.getByLabelText(/password/i)).toHaveClass("border-destructive");
  });

  it("form has correct method for action submission", () => {
    renderLogin();
    const form = screen.getByRole("button", { name: /log in/i }).closest("form");
    expect(form).toHaveAttribute("method", "post");
  });
});
