import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: getSessionMock },
}));

import { homeLoader, searchLoader, videoViewLoader } from "./video.service";

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
    } as any);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("homeLoader does NOT prefetch for a non-caregiver but still returns pagination", async () => {
    asSysadmin();
    const { qc, spy } = makeQc();
    const data = await homeLoader(qc)({
      request: new Request("http://localhost/?limit=10&offset=0"),
    } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("searchLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await searchLoader(qc)({
      request: new Request("http://localhost/search?q=cat"),
    } as any);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await searchLoader(qc2)({
      request: new Request("http://localhost/search?q=cat"),
    } as any);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ searchParams: "q=cat", q: "cat" });
  });

  it("videoViewLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await videoViewLoader(qc)({ params: { videoId: "v1" } } as any);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await videoViewLoader(qc2)({ params: { videoId: "v1" } } as any);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ videoId: "v1" });
  });
});
