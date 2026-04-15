import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPermission: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    site: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    study: {
      findUnique: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
    },
    siteStudy: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    videoStudy: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

import { getManageableSiteIds } from "../../domains/users/users.service.js";

describe("users.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getManageableSiteIds", () => {
    it("ignores stale admin permissions with invalid scope", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: "11111111-1111-1111-8111-111111111111",
          studyId: null,
          videoId: null,
        },
        {
          siteId: "33333333-3333-3333-8333-333333333333",
          studyId: null,
          videoId: null,
        },
      ]);
      prismaMock.site.findUnique
        .mockResolvedValueOnce({ id: "11111111-1111-1111-8111-111111111111" })
        .mockResolvedValueOnce(null);

      const result = await getManageableSiteIds(
        "actor-1",
        "22222222-2222-2222-8222-222222222222",
      );

      expect(result).toEqual([
        "22222222-2222-2222-8222-222222222222",
        "11111111-1111-1111-8111-111111111111",
      ]);
    });

    it("rethrows unexpected errors while resolving manageable sites", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: null,
          studyId: null,
          videoId: null,
        },
      ]);
      prismaMock.site.findMany.mockRejectedValue(new Error("Database unavailable"));

      await expect(
        getManageableSiteIds(
          "actor-1",
          "22222222-2222-2222-8222-222222222222",
        ),
      ).rejects.toThrow("Database unavailable");
    });
  });
});
