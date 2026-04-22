import type {
  AuditLog,
  Prisma,
  action_type,
  annotation_type,
  entity_type,
  permission_level,
  user_role,
  video_status,
} from "../../generated/prisma/index.js";

/** Prisma audit action enum. */
export type AuditActionType = action_type;

/**
 * Prisma audit entity enum.
 *
 * TODO: Add `INVITATION` to the schema if we audit invites later.
 */
export type AuditEntityType = entity_type;

/** Snapshot stored in `oldValues` and `newValues`. */
export type AuditSnapshot = Record<string, unknown>;

/** Acting user ID and client IP from the current request. Not an audit log row. */
export interface AuditActorContext {
  actorUserId: string | null;
  ipAddress: string | null;
}

/**
 * Audit event input for the current schema.
 * Use `{}` when one snapshot side does not apply.
 */
export interface AuditEventInput {
  actorUserId: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  siteId: string;
  oldValues: AuditSnapshot;
  newValues: AuditSnapshot;
  ipAddress?: string | null;
}

/** Prisma surface needed by `recordAudit`. */
export interface AuditWriteClient {
  auditLog: {
    create(args: {
      data: Prisma.AuditLogUncheckedCreateInput;
    }): Promise<AuditLog>;
  };
}

/** Minimal record shape needed for audited updates. */
export type AuditedRecord = {
  id: string;
};

/** Input for an update audit event. */
export type UpdateAuditEventInput<T extends AuditedRecord> = {
  actorUserId: string;
  entityType: AuditEntityType;
  siteId: string;
  before: T;
  after: T;
  snapshot: (value: T) => AuditSnapshot;
  ipAddress?: string | null;
};

export type AuditedUpdateBaseInput<TRecord extends AuditedRecord> = {
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

/** Video snapshot for audit rows. */
export interface AuditVideoSnapshot extends AuditSnapshot {
  id: string;
  uploadedByUserId: string;
  status: video_status;
  durationSeconds: number;
  takenAt: string | null;
  privateTitle?: string;
  privateNotes?: string | null;
}

/** User snapshot for audit rows. */
export interface AuditUserSnapshot extends AuditSnapshot {
  id: string;
  email: string;
  role: user_role;
  siteId: string;
  isDeactivated: boolean;
}

/** Permission snapshot for audit rows. */
export interface AuditPermissionSnapshot extends AuditSnapshot {
  id: string;
  userId: string;
  permissionLevel: permission_level;
  siteId: string | null;
  studyId: string | null;
  videoId: string | null;
}

/** Small annotation payload summary for audit rows. */
export interface AuditAnnotationPayloadSummary extends AuditSnapshot {
  text?: string;
  label?: string;
  tag?: string;
  changed?: boolean;
}

/** Annotation snapshot for audit rows. */
export interface AuditAnnotationSnapshot extends AuditSnapshot {
  id: string;
  videoId: string;
  authorUserId: string;
  studyId: string;
  siteId: string;
  type: annotation_type;
  timestampS: number;
  durationS: number;
  payload: AuditAnnotationPayloadSummary;
}

/** Clip snapshot for audit rows. */
export interface AuditClipSnapshot extends AuditSnapshot {
  id: string;
  sourceVideoId: string;
  createdByUserId: string;
  studyId: string;
  siteId: string;
  title: string;
  startTimeS: number;
  endTimeS: number;
}

/** Sequence snapshot for audit rows. */
export interface AuditSequenceSnapshot extends AuditSnapshot {
  id: string;
  videoId: string;
  createdByUserId: string;
  studyId: string;
  siteId: string;
  title: string;
}
