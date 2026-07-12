/**
 * @description Infers a video MIME type from a filename extension. Used when a
 * picked File has an empty `type` (notably the iOS Photos picker), so a
 * temporary `<video>` element can still recognise the blob as video.
 * @param fileName - The file name (may be empty)
 * @returns A `video/*` MIME type; defaults to `video/mp4`
 */
export function inferVideoMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "mov":
    case "qt":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "webm":
      return "video/webm";
    case "mp4":
    case "m4v":
    default:
      return "video/mp4";
  }
}

/**
 * @description Returns a blob guaranteed to carry a `video/*` MIME type. Files
 * from the iOS Photos picker often have an empty `type`, which prevents a
 * `<video>` element from loading them via `createObjectURL`. When the type is
 * missing/non-video, wraps the bytes in a new Blob with an inferred type.
 * @param file - The selected File or Blob
 * @returns The original file when already typed, else a re-typed Blob
 */
export function typedVideoBlob(file: Blob): Blob {
  if (file.type && file.type.startsWith("video/")) return file;
  const name = file instanceof File ? file.name : "";
  return new Blob([file], { type: inferVideoMimeType(name) });
}
