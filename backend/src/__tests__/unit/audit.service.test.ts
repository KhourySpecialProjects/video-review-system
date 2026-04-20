import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeAuditSnapshot,
  recordAudit,
  runAuditedUpdate,
  toAuditCreateInput,
  type AuditWriteClient,
} from "../../domains/audit/audit.service.js";
import type { AuditEventInput } from "../../domains/audit/audit.types.js";

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
      expect(normalizeAuditSnapshot([])).toEqual({});
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
  });
});
