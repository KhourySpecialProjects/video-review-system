import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));

import { getSessionRole, authGuardLoader } from "./auth-guard";

describe("session read de-duplication", () => {
    beforeEach(() => getSessionMock.mockReset());

    it("shares a single in-flight get-session across concurrent callers", async () => {
        let resolve!: (v: unknown) => void;
        getSessionMock.mockReturnValue(new Promise((r) => (resolve = r)));

        // Fire concurrent reads (mirrors parallel loaders in one navigation).
        const p1 = getSessionRole();
        const p2 = getSessionRole();
        const p3 = authGuardLoader();

        resolve({ data: { user: { role: "CAREGIVER" } } });
        await Promise.all([p1, p2, p3]);

        expect(getSessionMock).toHaveBeenCalledTimes(1);
    });

    it("issues a fresh get-session for a later navigation (no stale caching)", async () => {
        getSessionMock.mockResolvedValue({ data: { user: { role: "CAREGIVER" } } });
        await getSessionRole();
        await getSessionRole();
        // Each awaited call settles and clears the in-flight promise before the next.
        expect(getSessionMock).toHaveBeenCalledTimes(2);
    });
});
