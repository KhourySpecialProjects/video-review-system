// const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * @description Fetch wrapper that prepends the backend base URL + /domain prefix.
 * In development the base URL is empty so requests hit the Vite proxy at /domain/*.
 * In production it resolves to the deployed backend origin + /domain.
 *
 * @param path - The API path after /domain (e.g. `/videos`, `/auth/activate`)
 * @param init - Standard RequestInit options
 * @returns The fetch Response
 */
export const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`/api/domain${path}`, init);
