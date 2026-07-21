import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { EditUserDialog } from "./EditUserDialog";
import type { UserDetailResponse } from "../admin.types";

const testUser: UserDetailResponse = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "CLINICAL_REVIEWER",
  siteId: "site-1",
  isDeactivated: false,
  userPermissions: [],
};

/**
 * Renders the dialog inside a stub router that provides the routes it talks to:
 * the /admin/user-detail loader (user detail), the /sites/options loader, and
 * the /admin action (mutations).
 *
 * @param user - Detail returned by the /admin/user-detail loader.
 * @returns The onOpenChange spy plus Testing Library's render result.
 */
function renderDialog(user: UserDetailResponse = testUser) {
  const onOpenChange = vi.fn();

  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <EditUserDialog
          open
          userId={user.id}
          onOpenChange={onOpenChange}
          actorRole="SYSADMIN"
        />
      ),
    },
    { path: "/admin/user-detail", loader: () => user },
    {
      path: "/sites/options",
      loader: () => ({ sites: [{ id: "site-1", name: "Site A" }] }),
    },
    { path: "/admin", action: () => ({ ok: true }) },
  ]);

  return { onOpenChange, ...render(<Stub initialEntries={["/"]} />) };
}

describe("EditUserDialog", () => {
  it("renders the modal shell with the instant-save note and Done button", () => {
    renderDialog();

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(
      screen.getByText("Changes are saved automatically."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("shows the user's details once the detail loader resolves", async () => {
    renderDialog();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    // An active user offers the Deactivate action (status is editable at parity).
    expect(
      screen.getByRole("button", { name: "Deactivate" }),
    ).toBeInTheDocument();
  });

  it("closes via the Done button", async () => {
    const { onOpenChange } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
