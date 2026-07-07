/** @description An audit log row returned by the list endpoint. */
export type AuditLogListItem = {
  id: string;
  actorUserId: string;
  actorName: string;
  actionType:
    | "CREATE"
    | "READ"
    | "UPDATE"
    | "DELETE"
    | "DOWNLOAD"
    | "LOGIN";
  entityType:
    | "VIDEO"
    | "ANNOTATION"
    | "USER"
    | "STUDY"
    | "SEQUENCE"
    | "CLIP"
    | "SITE"
    | "PERMISSIONS"
    | "INVITATION";
  entityId: string;
  siteId: string | null;
  siteName: string | null;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
};

/** @description Paginated response from GET /api/domain/audit. */
export type ListAuditLogsResponse = {
  logs: AuditLogListItem[];
  total: number;
  limit: number;
  offset: number;
};
