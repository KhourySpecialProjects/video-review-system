import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewsLoader } from "./reviewsLoader";

const apiFetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
    apiFetch: (...args: Parameters<typeof fetch>) => apiFetchMock(...args),
}));

/**
 * @description Builds a fake successful `apiFetch` Response with the given body.
 * @param body - JSON body returned from `.json()`
 */
function okResponse(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => body,
    } as Response;
}

/**
 * @description Builds a minimal LoaderFunctionArgs compatible with the
 * loader. Only `request` is used at runtime; the cast keeps TS happy.
 * @param search - URL search string (e.g. "?study=A&page=2")
 */
function createLoaderArgs(search = ""): Parameters<typeof reviewsLoader>[0] {
    return {
        request: new Request(`http://localhost/reviews${search}`),
        params: {},
    } as Parameters<typeof reviewsLoader>[0];
}

beforeEach(() => {
    apiFetchMock.mockReset();
});

describe("reviewsLoader", () => {
    it("parses filters from the URL and returns them immediately", () => {
        apiFetchMock.mockResolvedValueOnce(
            okResponse({ videos: [], totalCount: 0, studies: [], sites: [] }),
        );

        const data = reviewsLoader(
            createLoaderArgs("?search=test&study=Study+A&page=3"),
        );

        expect(data.filters.search).toBe("test");
        expect(data.filters.study).toBe("Study A");
        expect(data.filters.page).toBe(3);
    });

    it("returns undefined filters when no params are provided", () => {
        apiFetchMock.mockResolvedValueOnce(
            okResponse({ videos: [], totalCount: 0, studies: [], sites: [] }),
        );

        const data = reviewsLoader(createLoaderArgs());
        expect(data.filters.search).toBeUndefined();
        expect(data.filters.study).toBeUndefined();
        expect(data.filters.page).toBeUndefined();
    });

    it("calls /reviews with the URL's search params", async () => {
        apiFetchMock.mockResolvedValueOnce(
            okResponse({ videos: [], totalCount: 0, studies: [], sites: [] }),
        );

        const data = reviewsLoader(
            createLoaderArgs("?study=Study+A&page=3"),
        );
        await data.dataPromise;

        expect(apiFetchMock).toHaveBeenCalledTimes(1);
        const [path, init] = apiFetchMock.mock.calls[0];
        expect(path).toMatch(/^\/reviews\?/);
        expect(path).toContain("study=Study+A");
        expect(path).toContain("page=3");
        expect(init).toHaveProperty("signal");
    });

    it("resolves dataPromise with the backend response", async () => {
        apiFetchMock.mockResolvedValueOnce(
            okResponse({
                videos: [],
                totalCount: 0,
                studies: [{ name: "Study A", status: "ongoing" }],
                sites: [{ name: "Boston" }],
            }),
        );

        const data = reviewsLoader(createLoaderArgs());
        const resolved = await data.dataPromise;

        expect(resolved.studies).toEqual([{ name: "Study A", status: "ongoing" }]);
        expect(resolved.sites).toEqual([{ name: "Boston" }]);
    });

    it("rejects dataPromise with a Response on non-2xx", async () => {
        apiFetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as Response);

        const data = reviewsLoader(createLoaderArgs());
        await expect(data.dataPromise).rejects.toBeInstanceOf(Response);
    });
});
