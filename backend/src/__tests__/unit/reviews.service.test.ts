import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    videoStudy: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
    prismaMock.videoStudy.update.mockReset();
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
      prismaMock.videoStudy.update.mockResolvedValue({ reviewStatus: nextDb });
      const result = await updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, next as never);
      expect(prismaMock.videoStudy.update).toHaveBeenCalledWith({
        where: compoundWhere,
        data: { reviewStatus: nextDb },
      });
      expect(result).toBe(next);
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
      expect(prismaMock.videoStudy.update).not.toHaveBeenCalled();
    });

    it("throws 404 when the row is missing", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue(null);
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, "in review" as never),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
