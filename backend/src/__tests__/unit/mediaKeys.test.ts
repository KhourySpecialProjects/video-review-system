import { describe, expect, it } from "vitest";
import { thumbnailKeyFor } from "../../lib/mediaKeys.js";

describe("thumbnailKeyFor", () => {
  it("swaps a video extension for .jpg", () => {
    expect(thumbnailKeyFor("uploads/abc/testvideo.mp4")).toBe(
      "uploads/abc/testvideo.jpg",
    );
  });

  it("swaps a non-mp4 extension for .jpg", () => {
    expect(thumbnailKeyFor("uploads/abc/clip.mov")).toBe("uploads/abc/clip.jpg");
  });

  it("appends .jpg when the key has no extension", () => {
    expect(thumbnailKeyFor("uploads/abc/sample")).toBe("uploads/abc/sample.jpg");
  });

  it("only strips the final path segment's extension, not dots in folders", () => {
    expect(thumbnailKeyFor("uploads/v1.2/name")).toBe("uploads/v1.2/name.jpg");
  });
});
