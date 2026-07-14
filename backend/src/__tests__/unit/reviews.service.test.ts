import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    videoStudy: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({ default: prismaMock }));

import { getReviewStatus, updateReviewStatus } from "../../domains/reviews/reviews.service.js";

const KEY = { studyId: "s1", videoId: "v1", siteId: "site1" };
const compoundWhere = { studyId_videoId_siteId: KEY };

describe("reviews.service review status", () => {
  beforeEach(() => {
    prismaMock.videoStudy.findUnique.mockReset();
    prismaMock.videoStudy.updateMany.mockReset();
  });

  describe("getReviewStatus", () => {
    it("returns the lowercase UI status for an existing row", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: "IN_REVIEW" });
      const result = await getReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId);
      expect(result).toBe("in review");
      expect(prismaMock.videoStudy.findUnique).toHaveBeenCalledWith({ where: compoundWhere });
    });

    it("throws 404 when the row is missing", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue(null);
      await expect(getReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("updateReviewStatus", () => {
    it.each([
      ["NOT_REVIEWED", "in review", "IN_REVIEW"],
      ["IN_REVIEW", "reviewed", "REVIEWED"],
      ["IN_REVIEW", "not reviewed", "NOT_REVIEWED"],
      ["REVIEWED", "in review", "IN_REVIEW"],
    ])("allows %s -> %s and persists", async (current, next, nextDb) => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: current });
      prismaMock.videoStudy.updateMany.mockResolvedValue({ count: 1 });
      const result = await updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, next as never);
      expect(prismaMock.videoStudy.updateMany).toHaveBeenCalledWith({
        where: { ...KEY, reviewStatus: current },
        data: { reviewStatus: nextDb },
      });
      expect(result).toBe(next);
    });

    it("throws 400 when the row was modified concurrently (CAS count 0)", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: "IN_REVIEW" });
      prismaMock.videoStudy.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, "reviewed" as never),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it.each([
      ["NOT_REVIEWED", "reviewed"],
      ["NOT_REVIEWED", "not reviewed"],
      ["REVIEWED", "not reviewed"],
      ["IN_REVIEW", "in review"],
    ])("rejects illegal transition %s -> %s with 400", async (current, next) => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: current });
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, next as never),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(prismaMock.videoStudy.updateMany).not.toHaveBeenCalled();
    });

    it("throws 404 when the row is missing", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue(null);
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, "in review" as never),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
