import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PermissionProvider } from "@/contexts/PermissionContext";
import type { PermissionLevel } from "@shared/permissions";
import type { ReviewStatus } from "@shared/review";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));

import { ReviewStatusControl } from "./ReviewStatusControl";

const IDS = { videoId: "v1", studyId: "s1", siteId: "site1" };

function renderControl(status: ReviewStatus, level: PermissionLevel) {
  const qc = new QueryClient();
  qc.setQueryData(["review-status", "v1", "s1", "site1"], {
    reviewStatus: status,
    permissionLevel: level,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <PermissionProvider level={level}>{children}</PermissionProvider>
    </QueryClientProvider>
  );
  render(<ReviewStatusControl {...IDS} />, { wrapper });
  return qc;
}

describe("ReviewStatusControl", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("shows Start review for a not-reviewed video (WRITE)", () => {
    renderControl("not reviewed", "WRITE");
    expect(screen.getByText("not reviewed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("shows Mark reviewed + Reopen for an in-review video (WRITE)", () => {
    renderControl("in review", "WRITE");
    expect(screen.getByRole("button", { name: "Mark reviewed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("shows only Reopen for a reviewed video (WRITE)", () => {
    renderControl("reviewed", "WRITE");
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
  });

  it("hides all buttons for a READ-only user but still shows the badge", () => {
    renderControl("in review", "READ");
    expect(screen.getByText("in review")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("PATCHes the next status and updates the badge on click", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reviewStatus: "in review" }),
    } as unknown as Response);

    renderControl("not reviewed", "WRITE");
    await userEvent.click(screen.getByRole("button", { name: "Start review" }));

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reviews/v1/s1/site1/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ reviewStatus: "in review" }),
      }),
    );
    await waitFor(() => expect(screen.getByText("in review")).toBeInTheDocument());
  });
});
