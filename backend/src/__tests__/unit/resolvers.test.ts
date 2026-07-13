import { beforeEach, describe, expect, it, vi } from "vitest";

// The resolvers module reads Prisma at import time, so the module mock must
// exist before `resolvers.ts` is evaluated.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    videoStudy: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

import { annotations, clips, sequences } from "../../lib/resolvers.js";

function reqWithQuery(query: Record<string, unknown>) {
  return { query } as any;
}

describe("ResourceResolver.fromQuery (video-derived authorization)", () => {
  beforeEach(() => {
    prismaMock.videoStudy.findMany.mockReset();
  });

  it("derives one context per VideoStudy row for the requested video", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([
      { studyId: "study-1", siteId: "site-1" },
      { studyId: "study-2", siteId: "site-2" },
    ]);

    const contexts = await annotations.fromQuery(reqWithQuery({ videoId: "vid-1" }));

    expect(prismaMock.videoStudy.findMany).toHaveBeenCalledWith({
      where: { videoId: "vid-1" },
      select: { studyId: true, siteId: true },
    });
    expect(contexts).toEqual([
      { studyId: "study-1", siteId: "site-1", videoId: "vid-1" },
      { studyId: "study-2", siteId: "site-2", videoId: "vid-1" },
    ]);
  });

  it("ignores client-supplied studyId/siteId in the query", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([
      { studyId: "real-study", siteId: "real-site" },
    ]);

    const contexts = await clips.fromQuery(
      reqWithQuery({ videoId: "vid-1", studyId: "attacker-study", siteId: "attacker-site" }),
    );

    expect(prismaMock.videoStudy.findMany).toHaveBeenCalledWith({
      where: { videoId: "vid-1" },
      select: { studyId: true, siteId: true },
    });
    expect(contexts).toEqual([
      { studyId: "real-study", siteId: "real-site", videoId: "vid-1" },
    ]);
  });

  it("returns [] when the video has no VideoStudy rows", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([]);
    const contexts = await sequences.fromQuery(reqWithQuery({ videoId: "vid-x" }));
    expect(contexts).toEqual([]);
  });

  it("returns [] without querying when videoId is missing", async () => {
    const contexts = await annotations.fromQuery(reqWithQuery({}));
    expect(contexts).toEqual([]);
    expect(prismaMock.videoStudy.findMany).not.toHaveBeenCalled();
  });
});
