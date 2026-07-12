/**
 * Derives the thumbnail object key for a video's S3 key.
 *
 * `Video.s3Key` is the literal object key of the uploaded video
 * (e.g. `uploads/<id>/clip.mp4`). The poster/thumbnail lives alongside it
 * with the same base name and a `.jpg` extension. The final path segment's
 * extension is swapped for `.jpg`; keys with no extension get `.jpg` appended.
 *
 * @param s3Key - The video's literal S3 object key
 * @returns The derived thumbnail object key
 */
export function thumbnailKeyFor(s3Key: string): string {
  return s3Key.replace(/\.[^./]+$/, "") + ".jpg";
}
