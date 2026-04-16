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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    site: {
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

import {
  getManageableSiteIds,
  listUsers,
  resolvePermissionScopeAccess,
} from "../../domains/users/users.service.js";

describe("users.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getManageableSiteIds", () => {
    it("adds explicit site-wide admin permissions to the manageable site set", async () => {
      prismaMock.userPermission.findFirst.mockResolvedValue(null);
      prismaMock.userPermission.findMany.mockResolvedValue([
        {
          siteId: "11111111-1111-1111-8111-111111111111",
        },
        {
          siteId: "33333333-3333-3333-8333-333333333333",
        },
      ]);

      const result = await getManageableSiteIds(
        "actor-1",
        "22222222-2222-2222-8222-222222222222",
      );

      expect(result).toEqual([
        "22222222-2222-2222-8222-222222222222",
        "11111111-1111-1111-8111-111111111111",
        "33333333-3333-3333-8333-333333333333",
      ]);
      expect(prismaMock.userPermission.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "actor-1",
          permissionLevel: "ADMIN",
          siteId: null,
          studyId: null,
          videoId: null,
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: "actor-1",
          permissionLevel: "ADMIN",
          siteId: { not: null },
          studyId: null,
          videoId: null,
        },
        select: {
          siteId: true,
        },
      });
    });

    it("returns all sites for a global admin permission", async () => {
      prismaMock.userPermission.findFirst.mockResolvedValue({
        id: "perm-global",
      });
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
      expect(prismaMock.userPermission.findMany).not.toHaveBeenCalled();
    });

    it("does not treat narrower study or video admin as full site administration", async () => {
      prismaMock.userPermission.findFirst.mockResolvedValue(null);
      prismaMock.userPermission.findMany.mockResolvedValue([]);

      const result = await getManageableSiteIds(
        "actor-1",
        "22222222-2222-2222-8222-222222222222",
      );

      expect(result).toEqual(["22222222-2222-2222-8222-222222222222"]);
      expect(prismaMock.userPermission.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "actor-1",
          permissionLevel: "ADMIN",
          siteId: null,
          studyId: null,
          videoId: null,
        },
        select: {
          id: true,
        },
      });
      expect(prismaMock.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: "actor-1",
          permissionLevel: "ADMIN",
          siteId: { not: null },
          studyId: null,
          videoId: null,
        },
        select: {
          siteId: true,
        },
      });
    });

    it("rethrows unexpected errors while loading explicit site admin rows", async () => {
      prismaMock.userPermission.findFirst.mockResolvedValue(null);
      prismaMock.userPermission.findMany.mockRejectedValue(
        new Error("Database unavailable"),
      );

      await expect(
        getManageableSiteIds(
          "actor-1",
          "22222222-2222-2222-8222-222222222222",
        ),
      ).rejects.toThrow("Database unavailable");
    });
  });

  describe("listUsers", () => {
    it("treats an explicit empty site restriction list as no accessible sites", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const result = await listUsers(
        {
          includeDeactivated: false,
          limit: 20,
          offset: 0,
        },
        [],
      );

      expect(result).toEqual({
        users: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            siteId: { in: [] },
          }),
        }),
      );
      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          siteId: { in: [] },
        }),
      });
    });
  });

  describe("resolvePermissionScopeAccess", () => {
    it("rejects a study-only scope when the study is not associated with any site", async () => {
      prismaMock.study.findUnique.mockResolvedValue({
        id: "33333333-3333-3333-8333-333333333333",
      });
      prismaMock.siteStudy.findMany.mockResolvedValue([]);

      await expect(
        resolvePermissionScopeAccess({
          siteId: null,
          studyId: "33333333-3333-3333-8333-333333333333",
          videoId: null,
        }),
      ).rejects.toThrow("Invalid permission scope");
    });

    it("rejects a video-only scope when the video is not associated with any site", async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: "44444444-4444-4444-8444-444444444444",
      });
      prismaMock.videoStudy.findMany.mockResolvedValue([]);

      await expect(
        resolvePermissionScopeAccess({
          siteId: null,
          studyId: null,
          videoId: "44444444-4444-4444-8444-444444444444",
        }),
      ).rejects.toThrow("Invalid permission scope");
    });
  });
});
