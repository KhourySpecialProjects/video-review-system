import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs } from "react-router";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: getSessionMock },
}));

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));

import { homeLoader, searchLoader, videoViewLoader, videoReviewLoader } from "./video.service";

function makeQc() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "prefetchQuery").mockResolvedValue(undefined);
  return { qc, spy };
}

const asCaregiver = () =>
  getSessionMock.mockResolvedValue({ data: { user: { role: "CAREGIVER" } } });
const asSysadmin = () =>
  getSessionMock.mockResolvedValue({ data: { user: { role: "SYSADMIN" } } });

describe("caregiver-gated prefetch loaders", () => {
  beforeEach(() => getSessionMock.mockReset());

  it("homeLoader prefetches for a caregiver and returns pagination", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    const data = await homeLoader(qc)({
      request: new Request("http://localhost/?limit=10&offset=0"),
    } as unknown as LoaderFunctionArgs);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("homeLoader does NOT prefetch for a non-caregiver but still returns pagination", async () => {
    asSysadmin();
    const { qc, spy } = makeQc();
    const data = await homeLoader(qc)({
      request: new Request("http://localhost/?limit=10&offset=0"),
    } as unknown as LoaderFunctionArgs);
    expect(spy).not.toHaveBeenCalled();
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("searchLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await searchLoader(qc)({
      request: new Request("http://localhost/search?q=cat"),
    } as unknown as LoaderFunctionArgs);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await searchLoader(qc2)({
      request: new Request("http://localhost/search?q=cat"),
    } as unknown as LoaderFunctionArgs);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ searchParams: "q=cat", q: "cat" });
  });

  it("videoViewLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await videoViewLoader(qc)({
      params: { videoId: "v1" },
    } as unknown as LoaderFunctionArgs);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await videoViewLoader(qc2)({
      params: { videoId: "v1" },
    } as unknown as LoaderFunctionArgs);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ videoId: "v1" });
  });
});

describe("videoReviewLoader", () => {
  // NOTE: must not be `() => apiFetchMock.mockReset()` — mockReset() returns
  // the mock itself, and Vitest treats a function returned from beforeEach as
  // an auto-cleanup callback, invoking it (with zero args) after the test and
  // re-triggering whatever mockImplementation the test set.
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("awaits status, sets the real permissionLevel, and seeds the status cache", async () => {
    const streamPayload = {
      video: { id: "v1", durationSeconds: 10, createdAt: "2026-01-01T00:00:00Z", takenAt: null },
      videoUrl: "https://s3/video.mp4",
      imgUrl: "https://s3/thumb.jpg",
      expiresIn: 3600,
    };
    const statusPayload = { reviewStatus: "in review", permissionLevel: "READ" };

    apiFetchMock.mockImplementation((path: string) => {
      const body = path.includes("/stream") ? streamPayload : statusPayload;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as unknown as Response);
    });

    const qc = new QueryClient();
    const data = await videoReviewLoader(qc)({
      params: { videoId: "v1", studyId: "s1", siteId: "site1" },
      request: new Request("http://localhost/review/v1/s1/site1"),
    } as unknown as LoaderFunctionArgs);

    expect(data.permissionLevel).toBe("READ");
    expect(data.videoId).toBe("v1");
    expect(qc.getQueryData(["review-status", "v1", "s1", "site1"])).toEqual(statusPayload);
  });
});
