/**
 * In-memory cache of client-generated video thumbnails.
 * Used as a fallback while MediaConvert is still processing the real thumbnail.
 * Entries are lost on page refresh, which is fine — by then the real thumbnail exists.
 */
const cache = new Map<string, string>()

/**
 * Stores a thumbnail data URL for a video.
 *
 * @param videoId - The video UUID
 * @param dataUrl - A data:image/jpeg;base64,... string
 */
export function setThumbnail(videoId: string, dataUrl: string): void {
  cache.set(videoId, dataUrl)
}

/**
 * Retrieves a cached thumbnail data URL for a video.
 *
 * @param videoId - The video UUID
 * @returns The data URL, or undefined if not cached
 */
export function getThumbnail(videoId: string): string | undefined {
  return cache.get(videoId)
}
