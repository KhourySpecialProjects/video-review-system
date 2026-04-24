import type { AuditLog, Prisma } from "../../generated/prisma/index.js";
import type {
  AuditedCreateInput,
  AuditedDeleteInput,
  AuditedUpdateInput,
  MappedAuditedCreateInput,
  MappedAuditedUpdateInput,
  AuditEventInput,
  AuditWriteClient,
  AuditSnapshot,
  UpdateAuditEventInput,
  AuditedRecord,
} from "./audit.types.js";

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

/** Creates one entity and writes its CREATE audit row. */
export async function runAuditedCreate<TRecord extends AuditedRecord>(
  input: AuditedCreateInput<TRecord>,
): Promise<TRecord>;
export async function runAuditedCreate<
  TRecord extends AuditedRecord,
  TResult,
>(
  input: MappedAuditedCreateInput<TRecord, TResult>,
): Promise<TResult>;
export async function runAuditedCreate<
  TRecord extends AuditedRecord,
  TResult,
>(
  input:
    | AuditedCreateInput<TRecord>
    | MappedAuditedCreateInput<TRecord, TResult>,
): Promise<TRecord | TResult> {
  const created = await input.create();

  await recordAudit(input.client, {
    actorUserId: input.actorUserId,
    actionType: "CREATE",
    entityType: input.entityType,
    entityId: created.id,
    siteId: await input.getSiteId(created),
    oldValues: {},
    newValues: input.snapshot(created),
    ipAddress: input.ipAddress ?? null,
  });

  if (input.mapResult) {
    return input.mapResult(created);
  }

  return created;
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
      siteId: await input.getSiteId(before, after),
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

/** Loads one entity, deletes it, and writes its DELETE audit row. */
export async function runAuditedDelete<TRecord extends AuditedRecord>(
  input: AuditedDeleteInput<TRecord>,
): Promise<void> {
  const before = await input.loadBefore();

  if (!before) {
    throw input.notFound;
  }

  await input.deleteRecord(before);

  await recordAudit(input.client, {
    actorUserId: input.actorUserId,
    actionType: "DELETE",
    entityType: input.entityType,
    entityId: before.id,
    siteId: await input.getSiteId(before),
    oldValues: input.snapshot(before),
    newValues: {},
    ipAddress: input.ipAddress ?? null,
  });
}

/** Writes one audit row. */
export async function recordAudit(
  client: AuditWriteClient,
  event: AuditEventInput,
): Promise<AuditLog> {
  return client.auditLog.create({
    data: toAuditCreateInput(event),
  });
}
