import { describe, it, expect } from "vitest";
import { inferVideoMimeType, typedVideoBlob } from "./videoBlob";

describe("inferVideoMimeType", () => {
  it("maps .mov to video/quicktime (case-insensitive)", () => {
    expect(inferVideoMimeType("IMG_1234.MOV")).toBe("video/quicktime");
  });
  it("maps .mp4/.m4v to video/mp4", () => {
    expect(inferVideoMimeType("clip.mp4")).toBe("video/mp4");
    expect(inferVideoMimeType("clip.m4v")).toBe("video/mp4");
  });
  it("maps .avi to video/x-msvideo", () => {
    expect(inferVideoMimeType("clip.avi")).toBe("video/x-msvideo");
  });
  it("defaults to video/mp4 for unknown/missing extensions", () => {
    expect(inferVideoMimeType("noext")).toBe("video/mp4");
    expect(inferVideoMimeType("")).toBe("video/mp4");
  });
});

describe("typedVideoBlob", () => {
  it("returns the same file when it already has a video/* type", () => {
    const f = new File(["x"], "a.mp4", { type: "video/mp4" });
    expect(typedVideoBlob(f)).toBe(f);
  });
  it("re-types a File that has an empty MIME type using its name", () => {
    const f = new File(["x"], "movie.mov", { type: "" });
    const out = typedVideoBlob(f);
    expect(out).not.toBe(f);
    expect(out.type).toBe("video/quicktime");
  });
  it("re-types a bare Blob (no name) to the default video/mp4", () => {
    const b = new Blob(["x"], { type: "" });
    expect(typedVideoBlob(b).type).toBe("video/mp4");
  });
});
