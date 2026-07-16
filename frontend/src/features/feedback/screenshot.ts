import html2canvas from "html2canvas-pro"

/**
 * Capture the current page as a PNG for feedback attachment. Returns null on any
 * failure so the caller can send feedback without a screenshot. Uses
 * html2canvas-pro (plain html2canvas cannot parse Tailwind v4 oklch colors).
 */
export async function captureScreenshot(): Promise<Uint8Array | null> {
  try {
    const canvas = await html2canvas(document.body, { logging: false, useCORS: true })
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    )
    if (!blob) return null
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return null
  }
}
