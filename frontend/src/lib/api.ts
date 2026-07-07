// const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * @description Error thrown by {@link apiFetch} when the API responds with an
 * HTML document instead of a JSON payload. This means the request never reached
 * the backend as intended — typically a CDN/gateway error page or the SPA's own
 * `index.html` fallback served by a misconfigured proxy. Detecting it here turns
 * the cryptic `Unexpected token '<', "<!doctype "... is not valid JSON` failure
 * (raised when a caller runs `.json()` on the HTML) into an actionable error.
 */
export class ApiHtmlResponseError extends Error {
  /** HTTP status of the offending response (often 200 when a CDN rewrites errors). */
  readonly status: number;
  /** Request path that returned HTML. */
  readonly path: string;

  /**
   * @description Builds an {@link ApiHtmlResponseError}.
   * @param status - HTTP status code of the response.
   * @param path - The full request path that returned HTML.
   */
  constructor(status: number, path: string) {
    super(
      `Expected JSON from ${path} but received an HTML page (HTTP ${status}). ` +
        `The request likely did not reach the API — check the backend and any CDN/proxy routing.`,
    );
    this.name = "ApiHtmlResponseError";
    this.status = status;
    this.path = path;
  }
}

/**
 * @description Fetch wrapper that prepends the backend base URL + /domain prefix.
 * In development the base URL is empty so requests hit the Vite proxy at /domain/*.
 * In production it resolves to the deployed backend origin + /domain.
 *
 * Guards against non-JSON error pages: if the response is an HTML document
 * (e.g. a CDN error page or SPA `index.html` fallback), it throws an
 * {@link ApiHtmlResponseError} instead of returning a Response whose `.json()`
 * would fail with a confusing syntax error. Note that a rewritten error page
 * frequently carries a `200` status, so an `res.ok` check alone is not enough.
 *
 * @param path - The API path after /domain (e.g. `/videos`, `/auth/activate`)
 * @param init - Standard RequestInit options
 * @returns The fetch Response
 * @throws {ApiHtmlResponseError} When the response is an HTML document rather
 * than a JSON API response.
 */
export const apiFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const fullPath = `/api/domain${path}`;
  const res = await fetch(fullPath, init);

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new ApiHtmlResponseError(res.status, fullPath);
  }

  return res;
};
