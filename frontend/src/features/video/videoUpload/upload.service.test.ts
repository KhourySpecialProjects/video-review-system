import { afterEach, describe, expect, it, vi } from "vitest"
import { uploadThumbnail } from "./upload.service"

describe("uploadThumbnail", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("decodes the data URL and PUTs it as image/jpeg", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => blob }) // decode data URL
      .mockResolvedValueOnce({ ok: true }) // PUT
    vi.stubGlobal("fetch", fetchMock)

    await uploadThumbnail("https://s3.example.com/put", "data:image/jpeg;base64,AAAA")

    expect(fetchMock).toHaveBeenNthCalledWith(1, "data:image/jpeg;base64,AAAA")
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://s3.example.com/put", {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "image/jpeg" },
    })
  })

  it("rejects when the PUT response is not ok", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" })
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ blob: async () => blob })
        .mockResolvedValueOnce({ ok: false, status: 403 }),
    )

    await expect(
      uploadThumbnail("https://s3.example.com/put", "data:image/jpeg;base64,AAAA"),
    ).rejects.toThrow(/403/)
  })
})
