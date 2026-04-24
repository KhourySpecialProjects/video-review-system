import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeAuditSnapshot,
  recordAudit,
  runAuditedCreate,
  runAuditedDelete,
  runAuditedUpdate,
  toAuditCreateInput,
} from "../../domains/audit/audit.service.js";
import type {
  AuditEventInput,
  AuditWriteClient,
} from "../../domains/audit/audit.types.js";

const createMock = vi.fn();

const client: AuditWriteClient = {
  auditLog: {
    create: createMock,
  },
};

function buildEvent(overrides: Partial<AuditEventInput> = {}): AuditEventInput {
  return {
    actorUserId: "user-1",
    actionType: "UPDATE",
    entityType: "USER",
    entityId: "11111111-1111-1111-8111-111111111111",
    siteId: "22222222-2222-2222-8222-222222222222",
    oldValues: {
      isDeactivated: false,
    },
    newValues: {
      isDeactivated: true,
    },
    ipAddress: "203.0.113.10",
    ...overrides,
  };
}

describe("audit.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("normalizeAuditSnapshot", () => {
    it("returns an empty object for non-object snapshot input", () => {
      expect(normalizeAuditSnapshot(null)).toEqual({});
      expect(normalizeAuditSnapshot(undefined)).toEqual({});
      expect(
        normalizeAuditSnapshot([] as unknown as Record<string, unknown>),
      ).toEqual({});
    });

    it("returns a shallow copy for plain object snapshots", () => {
      const snapshot = {
        isDeactivated: false,
        nested: {
          changed: true,
        },
      };

      expect(normalizeAuditSnapshot(snapshot)).toEqual(snapshot);
      expect(normalizeAuditSnapshot(snapshot)).not.toBe(snapshot);
    });
  });

  describe("toAuditCreateInput", () => {
    it("normalizes missing snapshots to empty objects", () => {
      expect(
        toAuditCreateInput(
          buildEvent({
            oldValues: {} as Record<string, unknown>,
            newValues: {} as Record<string, unknown>,
            ipAddress: null,
          }),
        ),
      ).toEqual({
        actorUserId: "user-1",
        actionType: "UPDATE",
        entityType: "USER",
        entityId: "11111111-1111-1111-8111-111111111111",
        siteId: "22222222-2222-2222-8222-222222222222",
        oldValues: {},
        newValues: {},
        ipAddress: null,
      });
    });

    it("allows audit rows without one authoritative site", () => {
      expect(
        toAuditCreateInput(
          buildEvent({
            siteId: null,
          }),
        ),
      ).toMatchObject({
        siteId: null,
      });
    });
  });

  describe("recordAudit", () => {
    it("writes one audit row using the provided client", async () => {
      createMock.mockResolvedValue({
        id: "audit-1",
      });

      await recordAudit(client, buildEvent());

      expect(createMock).toHaveBeenCalledWith({
        data: {
          actorUserId: "user-1",
          actionType: "UPDATE",
          entityType: "USER",
          entityId: "11111111-1111-1111-8111-111111111111",
          siteId: "22222222-2222-2222-8222-222222222222",
          oldValues: {
            isDeactivated: false,
          },
          newValues: {
            isDeactivated: true,
          },
          ipAddress: "203.0.113.10",
        },
      });
    });
  });

  describe("runAuditedCreate", () => {
    it("creates a record and writes a CREATE audit row", async () => {
      createMock.mockResolvedValue({
        id: "audit-1",
      });

      const result = await runAuditedCreate({
        client,
        create: async () => ({
          id: "44444444-4444-4444-8444-444444444444",
          siteId: null,
          status: "UPLOADING",
        }),
        actorUserId: "user-1",
        entityType: "VIDEO",
        snapshot: (value) => ({
          status: value.status,
        }),
        getSiteId: (value) => value.siteId,
        ipAddress: "203.0.113.10",
      });

      expect(result).toEqual({
        id: "44444444-4444-4444-8444-444444444444",
        siteId: null,
        status: "UPLOADING",
      });
      expect(createMock).toHaveBeenCalledWith({
        data: {
          actorUserId: "user-1",
          actionType: "CREATE",
          entityType: "VIDEO",
          entityId: "44444444-4444-4444-8444-444444444444",
          siteId: null,
          oldValues: {},
          newValues: {
            status: "UPLOADING",
          },
          ipAddress: "203.0.113.10",
        },
      });
    });
  });

  describe("runAuditedUpdate", () => {
    it("loads, updates, and writes one audit row", async () => {
      createMock.mockResolvedValue({
        id: "audit-1",
      });

      const result = await runAuditedUpdate({
        client,
        loadBefore: async () => ({
          id: "11111111-1111-1111-8111-111111111111",
          siteId: "22222222-2222-2222-8222-222222222222",
          isDeactivated: false,
        }),
        update: async () => ({
          id: "11111111-1111-1111-8111-111111111111",
          siteId: "33333333-3333-3333-8333-333333333333",
          isDeactivated: true,
        }),
        notFound: new Error("User not found"),
        actorUserId: "user-1",
        entityType: "USER",
        snapshot: (value) => ({
          isDeactivated: value.isDeactivated,
        }),
        getSiteId: (_before, after) => after.siteId,
        ipAddress: "203.0.113.10",
        mapResult: (value) => ({
          id: value.id,
          isDeactivated: value.isDeactivated,
        }),
      });

      expect(result).toEqual({
        id: "11111111-1111-1111-8111-111111111111",
        isDeactivated: true,
      });
      expect(createMock).toHaveBeenCalledWith({
        data: {
          actorUserId: "user-1",
          actionType: "UPDATE",
          entityType: "USER",
          entityId: "11111111-1111-1111-8111-111111111111",
          siteId: "33333333-3333-3333-8333-333333333333",
          oldValues: {
            isDeactivated: false,
          },
          newValues: {
            isDeactivated: true,
          },
          ipAddress: "203.0.113.10",
        },
      });
    });

    it("allows getSiteId to return null", async () => {
      createMock.mockResolvedValue({
        id: "audit-1",
      });

      await runAuditedUpdate({
        client,
        loadBefore: async () => ({
          id: "11111111-1111-1111-8111-111111111111",
          status: "UPLOADING",
        }),
        update: async () => ({
          id: "11111111-1111-1111-8111-111111111111",
          status: "UPLOADED",
        }),
        notFound: new Error("Video not found"),
        actorUserId: "user-1",
        entityType: "VIDEO",
        snapshot: (value) => ({
          status: value.status,
        }),
        getSiteId: () => null,
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          siteId: null,
        }),
      });
    });
  });

  describe("runAuditedDelete", () => {
    it("deletes a record and writes a DELETE audit row", async () => {
      createMock.mockResolvedValue({
        id: "audit-1",
      });
      const deleteRecord = vi.fn().mockResolvedValue(undefined);

      await runAuditedDelete({
        client,
        loadBefore: async () => ({
          id: "55555555-5555-5555-8555-555555555555",
          siteId: "22222222-2222-2222-8222-222222222222",
          title: "Clip title",
        }),
        deleteRecord,
        notFound: new Error("Clip not found"),
        actorUserId: "user-1",
        entityType: "CLIP",
        snapshot: (value) => ({
          title: value.title,
        }),
        getSiteId: (value) => value.siteId,
      });

      expect(deleteRecord).toHaveBeenCalledWith({
        id: "55555555-5555-5555-8555-555555555555",
        siteId: "22222222-2222-2222-8222-222222222222",
        title: "Clip title",
      });
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: "DELETE",
          entityType: "CLIP",
          entityId: "55555555-5555-5555-8555-555555555555",
          oldValues: {
            title: "Clip title",
          },
          newValues: {},
        }),
      });
    });
  });
});
