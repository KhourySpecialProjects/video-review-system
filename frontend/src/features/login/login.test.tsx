import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Login } from "./login";
import * as useLoginModule from "@/hooks/use-login";

const mockHandleSubmit = vi.fn(async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
});

const defaultHook: ReturnType<typeof useLoginModule.useLogin> = {
  isSubmitting: false,
  fieldErrors: {},
  formError: undefined,
  handleSubmit: mockHandleSubmit,
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockHandleSubmit.mockImplementation(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
  });
});

function renderLogin(overrides: Partial<typeof defaultHook> = {}) {
  vi.spyOn(useLoginModule, "useLogin").mockReturnValue({ ...defaultHook, ...overrides });
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
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
    renderLogin({ isSubmitting: true });
    const button = screen.getByRole("button", { name: /logging in/i });
    expect(button).toBeDisabled();
  });

  it("button is enabled when not submitting", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /log in/i })).not.toBeDisabled();
  });

  it("displays form-level error alert", () => {
    renderLogin({ formError: "Incorrect email or password. Please try again." });
    expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
  });

  it("does not show error alert when there is no form error", () => {
    renderLogin();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays email field error", () => {
    renderLogin({ fieldErrors: { email: "Invalid email address" } });
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("displays password field error", () => {
    renderLogin({ fieldErrors: { password: "Password is required" } });
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("applies destructive style to email input when there is an email error", () => {
    renderLogin({ fieldErrors: { email: "Invalid email address" } });
    expect(screen.getByLabelText(/email/i)).toHaveClass("border-destructive");
  });

  it("applies destructive style to password input when there is a password error", () => {
    renderLogin({ fieldErrors: { password: "Password is required" } });
    expect(screen.getByLabelText(/password/i)).toHaveClass("border-destructive");
  });

  it("calls handleSubmit when the form is submitted", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(mockHandleSubmit).toHaveBeenCalledOnce();
  });
});
