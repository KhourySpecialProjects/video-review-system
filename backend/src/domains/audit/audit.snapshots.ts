import type {
  Annotation,
  CaregiverVideoMetadata,
  User,
  UserPermission,
  Video,
  VideoClip,
  StitchedSequence,
} from "../../generated/prisma/index.js";
import type {
  AuditAnnotationPayloadSummary,
  AuditAnnotationSnapshot,
  AuditAnnotationUpdateSnapshot,
  AuditClipSnapshot,
  AuditPermissionSnapshot,
  AuditSequenceSnapshot,
  AuditUserSnapshot,
  AuditVideoSnapshot,
} from "./audit.types.js";

type VideoSnapshotSource = Pick<
  Video,
  "uploadedByUserId" | "status" | "durationSeconds" | "takenAt"
>;
type VideoMetadataSnapshotSource = Pick<
  CaregiverVideoMetadata,
  "privateTitle" | "privateNotes"
>;
type UserSnapshotSource = Pick<
  User,
  "id" | "email" | "role" | "siteId" | "isDeactivated"
>;
type UserPermissionSnapshotSource = Pick<
  UserPermission,
  "userId" | "permissionLevel" | "siteId" | "studyId" | "videoId"
>;
type AnnotationSnapshotSource = Pick<
  Annotation,
  | "videoId"
  | "authorUserId"
  | "studyId"
  | "siteId"
  | "type"
  | "timestampS"
  | "durationS"
  | "payload"
>;
type ClipSnapshotSource = Pick<
  VideoClip,
  | "sourceVideoId"
  | "createdByUserId"
  | "studyId"
  | "siteId"
  | "title"
  | "startTimeS"
  | "endTimeS"
>;
type SequenceSnapshotSource = Pick<
  StitchedSequence,
  "videoId" | "createdByUserId" | "studyId" | "siteId" | "title"
>;

/** Returns true for plain objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads one string field from an object. */
function pickString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Builds the safe video fields stored in audit JSON. */
export function buildVideoSnapshot(
  video: VideoSnapshotSource,
  metadata?: VideoMetadataSnapshotSource | null,
): AuditVideoSnapshot {
  const snapshot: AuditVideoSnapshot = {
    uploadedByUserId: video.uploadedByUserId,
    status: video.status,
    durationSeconds: video.durationSeconds,
    takenAt: video.takenAt?.toISOString() ?? null,
  };

  if (metadata) {
    snapshot.privateTitle = metadata.privateTitle;
    snapshot.privateNotes = metadata.privateNotes;
  }

  return snapshot;
}

/** Builds a user snapshot. */
export function buildUserSnapshot(user: UserSnapshotSource): AuditUserSnapshot {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    siteId: user.siteId,
    isDeactivated: user.isDeactivated,
  };
}

/** Builds a permission snapshot. */
export function buildPermissionSnapshot(
  permission: UserPermissionSnapshotSource,
): AuditPermissionSnapshot {
  return {
    userId: permission.userId,
    permissionLevel: permission.permissionLevel,
    siteId: permission.siteId,
    studyId: permission.studyId,
    videoId: permission.videoId,
  };
}

/**
 * Builds a small annotation payload summary.
 */
export function summarizeAnnotationPayload(
  type: AnnotationSnapshotSource["type"],
  payload: AnnotationSnapshotSource["payload"],
): AuditAnnotationPayloadSummary {
  if (
    type === "drawing_box" ||
    type === "drawing_circle" ||
    type === "freehand_drawing"
  ) {
    return { changed: true };
  }

  if (!isRecord(payload)) {
    return {};
  }

  const summary: AuditAnnotationPayloadSummary = {};

  switch (type) {
    case "text_comment": {
      const text = pickString(payload, "text");
      if (text) summary.text = text;
      break;
    }
    case "tag": {
      const label = pickString(payload, "label");
      const tag = pickString(payload, "tag");
      if (label) summary.label = label;
      if (tag) summary.tag = tag;
      break;
    }
  }

  return summary;
}

/** Builds an annotation snapshot. */
export function buildAnnotationSnapshot(
  annotation: AnnotationSnapshotSource,
): AuditAnnotationSnapshot {
  return {
    videoId: annotation.videoId,
    authorUserId: annotation.authorUserId,
    studyId: annotation.studyId,
    siteId: annotation.siteId,
    type: annotation.type,
    timestampS: annotation.timestampS,
    durationS: annotation.durationS,
    payload: summarizeAnnotationPayload(annotation.type, annotation.payload),
  };
}

/** Builds the safe fields stored for annotation updates. */
export function buildAnnotationUpdateSnapshot(
  annotation: AnnotationSnapshotSource,
): AuditAnnotationUpdateSnapshot {
  return {
    timestampS: annotation.timestampS,
    durationS: annotation.durationS,
    payload: summarizeAnnotationPayload(annotation.type, annotation.payload),
  };
}

/** Builds a clip snapshot. */
export function buildClipSnapshot(clip: ClipSnapshotSource): AuditClipSnapshot {
  return {
    sourceVideoId: clip.sourceVideoId,
    createdByUserId: clip.createdByUserId,
    studyId: clip.studyId,
    siteId: clip.siteId,
    title: clip.title,
    startTimeS: clip.startTimeS,
    endTimeS: clip.endTimeS,
  };
}

/** Builds a sequence snapshot. */
export function buildSequenceSnapshot(
  sequence: SequenceSnapshotSource,
): AuditSequenceSnapshot {
  return {
    videoId: sequence.videoId,
    createdByUserId: sequence.createdByUserId,
    studyId: sequence.studyId,
    siteId: sequence.siteId,
    title: sequence.title,
  };
}
