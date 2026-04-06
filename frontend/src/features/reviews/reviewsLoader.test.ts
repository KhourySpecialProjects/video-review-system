import { describe, it, expect } from "vitest";
import { reviewsLoader } from "./reviewsLoader";

/**
 * @description Creates a minimal LoaderFunctionArgs-compatible object
 * with the given URL search params.
 * @param search - URL search string (e.g. "?study=A&page=2")
 */
function createLoaderArgs(search = "") {
    return {
        request: new Request(`http://localhost/reviews${search}`),
        params: {},
    };
}

describe("reviewsLoader", () => {
    it("returns empty videos array", async () => {
        const data = await reviewsLoader(createLoaderArgs());
        expect(data.videos).toEqual([]);
    });

    it("returns zero totalCount", async () => {
        const data = await reviewsLoader(createLoaderArgs());
        expect(data.totalCount).toBe(0);
    });

    it("returns empty studies array", async () => {
        const data = await reviewsLoader(createLoaderArgs());
        expect(data.studies).toEqual([]);
    });

    it("returns empty sites array", async () => {
        const data = await reviewsLoader(createLoaderArgs());
        expect(data.sites).toEqual([]);
    });

    it("parses filters from search params", async () => {
        const data = await reviewsLoader(
            createLoaderArgs("?search=test&study=Study+A&page=3")
        );
        expect(data.filters.search).toBe("test");
        expect(data.filters.study).toBe("Study A");
        expect(data.filters.page).toBe(3);
    });

    it("returns undefined filters when no params are provided", async () => {
        const data = await reviewsLoader(createLoaderArgs());
        expect(data.filters.search).toBeUndefined();
        expect(data.filters.study).toBeUndefined();
        expect(data.filters.page).toBeUndefined();
    });
});
