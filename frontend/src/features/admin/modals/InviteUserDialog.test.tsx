import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { InviteUserDialog } from "./InviteUserDialog";

/**
 * Renders the dialog inside a stub router that provides the routes it talks to:
 * the /admin/invite action (returns a token) and the /sites/options loader.
 *
 * @param inviteAction - Action for POST /admin/invite (defaults to a success
 *   response carrying a token, simulating a created invitation).
 * @returns The onOpenChange spy plus Testing Library's render result.
 */
function renderDialog(
  inviteAction: () => unknown = () => ({ ok: true, token: "test-token-123" }),
) {
  const onOpenChange = vi.fn();

  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <InviteUserDialog
          open
          onOpenChange={onOpenChange}
          actorRole="SYSADMIN"
        />
      ),
    },
    { path: "/admin/invite", action: inviteAction },
    {
      path: "/sites/options",
      loader: () => ({ sites: [{ id: "site-1", name: "Site A" }] }),
    },
  ]);

  return { onOpenChange, ...render(<Stub initialEntries={["/"]} />) };
}

describe("InviteUserDialog", () => {
  beforeEach(() => {
    // jsdom has no clipboard by default; provide a spy-able one.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("renders the invite form initially", () => {
    renderDialog();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get Invite Link" }),
    ).toBeInTheDocument();
    // The link view is not shown until an invite is created.
    expect(
      screen.queryByRole("button", { name: "Copy signup link" }),
    ).not.toBeInTheDocument();
  });

  it("transitions to the link view showing the signup URL after a successful invite", async () => {
    renderDialog();

    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Get Invite Link" }),
    );

    // The read-only link input carries the token appended to the current origin.
    const link = await screen.findByDisplayValue(
      `${window.location.origin}/signup/test-token-123`,
    );
    expect(link).toBeInTheDocument();
    expect(screen.getByText("Expires in 5 days.")).toBeInTheDocument();
  });

  it("copies the signup link to the clipboard", async () => {
    renderDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "Get Invite Link" }),
    );
    const copyButton = await screen.findByRole("button", {
      name: "Copy signup link",
    });
    await userEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/signup/test-token-123`,
    );
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("returns to a fresh form when 'Invite another' is clicked", async () => {
    renderDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "Get Invite Link" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Invite another" }),
    );

    // Back on the form: the email field and submit button are shown again,
    // and the link view is gone.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get Invite Link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy signup link" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the form open and does not show a link on a failed invite", async () => {
    renderDialog(() => ({ ok: false, error: "Not allowed" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Get Invite Link" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Get Invite Link" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Copy signup link" }),
    ).not.toBeInTheDocument();
  });
});
