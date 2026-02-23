/**
 * Computes output dimensions that preserve aspect ratio and guarantee even
 * pixel counts (required by H.264).
 *
 * @param displayW - Source display width (post-rotation).
 * @param displayH - Source display height (post-rotation).
 * @param targetShort - Desired length of the shorter side.
 */
export function getOutputDims(
  displayW: number,
  displayH: number,
  targetShort: number
): { outW: number; outH: number } {
  const aspect = displayW / displayH;
  let outW: number, outH: number;
  if (displayW >= displayH) {
    outH = targetShort;
    outW = Math.round(outH * aspect);
  } else {
    outW = targetShort;
    outH = Math.round(outW / aspect);
  }
  if (outW % 2 !== 0) outW++;
  if (outH % 2 !== 0) outH++;
  return { outW, outH };
}

/**
 * Returns `true` if the browser supports the WebCodecs API
 * (`VideoDecoder` + `VideoEncoder`).
 */
export function isSupported(): boolean {
  return "VideoDecoder" in window && "VideoEncoder" in window;
}

/** Returns `true` if the browser exposes the WebGPU API. */
export function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}