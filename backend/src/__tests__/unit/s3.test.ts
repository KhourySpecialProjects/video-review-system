import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedUrlMock } = vi.hoisted(() => ({ getSignedUrlMock: vi.fn() }));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { generatePresignedPutUrl } from "../../lib/s3.js";

describe("generatePresignedPutUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset();
    process.env.S3_BUCKET_NAME = "test-bucket";
  });

  it("signs a PutObject for the key without a signed Content-Type and returns the URL", async () => {
    getSignedUrlMock.mockResolvedValue("https://s3.example.com/put-url");

    const url = await generatePresignedPutUrl("uploads/abc/clip.jpg", 1800);

    expect(url).toBe("https://s3.example.com/put-url");
    const [, command, opts] = getSignedUrlMock.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({ Bucket: "test-bucket", Key: "uploads/abc/clip.jpg" });
    expect(command.input).not.toHaveProperty("ContentType");
    expect(opts).toEqual({ expiresIn: 1800 });
  });

  it("defaults expiresIn to 3600", async () => {
    getSignedUrlMock.mockResolvedValue("https://s3.example.com/put-url");

    await generatePresignedPutUrl("uploads/abc/clip.jpg");

    const [, , opts] = getSignedUrlMock.mock.calls[0];
    expect(opts).toEqual({ expiresIn: 3600 });
  });
});
