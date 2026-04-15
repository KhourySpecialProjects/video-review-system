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
    it("adds explicit site-wide admin permissions and ignores stale site rows", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: "11111111-1111-1111-8111-111111111111",
        },
        {
          siteId: "33333333-3333-3333-8333-333333333333",
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

    it("returns all sites for a global admin permission", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: null,
        },
      ]);
      prismaMock.site.findMany.mockResolvedValue([
        { id: "11111111-1111-1111-8111-111111111111" },
        { id: "22222222-2222-2222-8222-222222222222" },
      ]);

      const result = await getManageableSiteIds(
        "actor-1",
        "33333333-3333-3333-8333-333333333333",
      );

      expect(result).toEqual([
        "11111111-1111-1111-8111-111111111111",
        "22222222-2222-2222-8222-222222222222",
      ]);
    });

    it("does not treat narrower study or video admin as full site administration", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([]);

      const result = await getManageableSiteIds(
        "actor-1",
        "22222222-2222-2222-8222-222222222222",
      );

      expect(result).toEqual(["22222222-2222-2222-8222-222222222222"]);
    });

    it("rethrows unexpected errors while loading explicit site admin rows", async () => {
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: "11111111-1111-1111-8111-111111111111",
        },
      ]);
      prismaMock.site.findUnique.mockRejectedValue(new Error("Database unavailable"));

      await expect(
        getManageableSiteIds(
          "actor-1",
          "22222222-2222-2222-8222-222222222222",
        ),
      ).rejects.toThrow("Database unavailable");
    });
  });
});
