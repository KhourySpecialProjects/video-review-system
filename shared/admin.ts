/** @description Aggregate stats returned by GET /api/domain/admin/stats. */
export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  newUsersThisMonth: number;
  totalSites: number;
  totalStudies: number;
  studiesNotStarted: number;
  studiesInProgress: number;
  studiesFinished: number;
  totalAuditActions: number;
  auditCreates: number;
  auditUpdates: number;
  auditDeletes: number;
  totalVideos: number;
  pendingReviews: number;
};

/** @description A single data point in the admin chart time series. */
export type AdminChartDataPoint = {
  month: string;
  [key: string]: string | number;
};

/** @description Response from GET /api/domain/admin/chart. */
export type AdminChartResponse = {
  data: AdminChartDataPoint[];
};
