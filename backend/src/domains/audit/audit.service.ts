import type { AuditLog, Prisma } from "../../generated/prisma/index.js";
import type {
  AuditEntityType,
  AuditEventInput,
  AuditSnapshot,
} from "./audit.types.js";

/**
 * Prisma surface needed by `recordAudit`.
 */
export interface AuditWriteClient {
  auditLog: {
    create(args: {
      data: Prisma.AuditLogUncheckedCreateInput;
    }): Promise<AuditLog>;
  };
}

type AuditedRecord = {
  id: string;
};

/** Input for an update audit event. */
type UpdateAuditEventInput<T extends AuditedRecord> = {
  actorUserId: string;
  entityType: AuditEntityType;
  siteId: string;
  before: T;
  after: T;
  snapshot: (value: T) => AuditSnapshot;
  ipAddress?: string | null;
};

type AuditedUpdateBaseInput<TRecord extends AuditedRecord> = {
  client: AuditWriteClient;
  loadBefore: () => Promise<TRecord | null>;
  update: () => Promise<TRecord>;
  notFound: Error;
  actorUserId: string;
  entityType: AuditEntityType;
  snapshot: (value: TRecord) => AuditSnapshot;
  getSiteId: (before: TRecord, after: TRecord) => string;
  ipAddress?: string | null;
};

/** Input for a transaction-safe audited update. */
export type AuditedUpdateInput<TRecord extends AuditedRecord> =
  AuditedUpdateBaseInput<TRecord> & {
    mapResult?: undefined;
  };

/** Input for a transaction-safe audited update with mapped output. */
export type MappedAuditedUpdateInput<
  TRecord extends AuditedRecord,
  TResult,
> = AuditedUpdateBaseInput<TRecord> & {
  mapResult: (value: TRecord) => TResult;
};

/**
 * Ensures a snapshot is object-shaped.
 */
export function normalizeAuditSnapshot(
  snapshot: AuditSnapshot | null | undefined,
): AuditSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {};
  }

  return { ...snapshot };
}

/** Maps an audit event to Prisma create input. */
export function toAuditCreateInput(
  event: AuditEventInput,
): Prisma.AuditLogUncheckedCreateInput {
  return {
    actorUserId: event.actorUserId,
    actionType: event.actionType,
    entityType: event.entityType,
    entityId: event.entityId,
    siteId: event.siteId,
    oldValues: normalizeAuditSnapshot(
      event.oldValues,
    ) as Prisma.InputJsonObject,
    newValues: normalizeAuditSnapshot(
      event.newValues,
    ) as Prisma.InputJsonObject,
    ipAddress: event.ipAddress ?? null,
  };
}

/** Builds an UPDATE audit event from before and after records. */
function buildUpdateAuditEvent<T extends AuditedRecord>(
  input: UpdateAuditEventInput<T>,
): AuditEventInput {
  return {
    actorUserId: input.actorUserId,
    actionType: "UPDATE",
    entityType: input.entityType,
    entityId: input.before.id,
    siteId: input.siteId,
    oldValues: input.snapshot(input.before),
    newValues: input.snapshot(input.after),
    ipAddress: input.ipAddress ?? null,
  };
}

/** Loads, updates, and audits one entity update. */
export async function runAuditedUpdate<TRecord extends AuditedRecord>(
  input: AuditedUpdateInput<TRecord>,
): Promise<TRecord>;
export async function runAuditedUpdate<
  TRecord extends AuditedRecord,
  TResult,
>(
  input: MappedAuditedUpdateInput<TRecord, TResult>,
): Promise<TResult>;
export async function runAuditedUpdate<
  TRecord extends AuditedRecord,
  TResult,
>(
  input:
    | AuditedUpdateInput<TRecord>
    | MappedAuditedUpdateInput<TRecord, TResult>,
): Promise<TRecord | TResult> {
  const before = await input.loadBefore();

  if (!before) {
    throw input.notFound;
  }

  const after = await input.update();

  await recordAudit(
    input.client,
    buildUpdateAuditEvent({
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      siteId: input.getSiteId(before, after),
      before,
      after,
      snapshot: input.snapshot,
      ipAddress: input.ipAddress,
    }),
  );

  if (input.mapResult) {
    return input.mapResult(after);
  }

  return after;
}

/**
 * Writes one audit row.
 *
 * TODO: Some flows do not have a real `entityId` or `siteId`.
 * Skip those until the schema changes or the route is clearer.
 */
export async function recordAudit(
  client: AuditWriteClient,
  event: AuditEventInput,
): Promise<AuditLog> {
  return client.auditLog.create({
    data: toAuditCreateInput(event),
  });
}
