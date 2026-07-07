import type { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import type { AdminStats, AdminChartDataPoint, AdminChartResponse } from "@shared/admin.js";
import type { AdminChartQuery } from "./admin.types.js";

/**
 * @description Formats a Date into a "YYYY-MM" string for chart grouping.
 *
 * @param date - The date to format.
 * @returns Month string in "YYYY-MM" format.
 */
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * @description Returns a Date that is `months` months before now, set to
 * the first day of that month at midnight UTC.
 *
 * @param months - Number of months to go back.
 * @returns Start date.
 */
function getStartDate(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - months, 1));
}

/**
 * @description Generates an ordered list of "YYYY-MM" strings from
 * startDate to now, inclusive.
 *
 * @param startDate - The earliest month to include.
 * @returns Array of month strings.
 */
function generateMonthRange(startDate: Date): string[] {
  const months: string[] = [];
  const now = new Date();
  const current = new Date(
    Date.UTC(startDate.getFullYear(), startDate.getMonth(), 1),
  );

  while (current <= now) {
    months.push(formatMonth(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
}

/**
 * @description Aggregates records by month, producing a count per month.
 * Fills in zero-value months so the chart has continuous data.
 *
 * @param records - Array of objects with a createdAt Date field.
 * @param months - Number of months of history.
 * @returns Array of chart data points with month and count.
 */
function aggregateByMonth(
  records: { createdAt: Date }[],
  months: number,
): AdminChartDataPoint[] {
  const startDate = getStartDate(months);
  const monthRange = generateMonthRange(startDate);
  const counts = new Map<string, number>();

  for (const month of monthRange) {
    counts.set(month, 0);
  }

  for (const record of records) {
    const month = formatMonth(record.createdAt);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return monthRange.map((month) => ({
    month,
    count: counts.get(month) ?? 0,
  }));
}

/**
 * @description Aggregates records by month and a grouping field, producing
 * pivoted data points. Used for stacked area charts (e.g. studies by status,
 * audits by action type).
 *
 * @param records - Array of objects with createdAt and a grouping field.
 * @param groupField - The field name to group by (e.g. "status", "actionType").
 * @param months - Number of months of history.
 * @returns Array of chart data points with month and one key per group value.
 */
function aggregateByMonthAndGroup<T extends { createdAt: Date }>(
  records: T[],
  groupField: keyof T,
  months: number,
): AdminChartDataPoint[] {
  const startDate = getStartDate(months);
  const monthRange = generateMonthRange(startDate);
  const grouped = new Map<string, Map<string, number>>();

  for (const month of monthRange) {
    grouped.set(month, new Map());
  }

  for (const record of records) {
    const month = formatMonth(record.createdAt);
    const group = String(record[groupField]);
    const monthMap = grouped.get(month);
    if (monthMap) {
      monthMap.set(group, (monthMap.get(group) ?? 0) + 1);
    }
  }

  return monthRange.map((month) => {
    const monthMap = grouped.get(month) ?? new Map();
    const point: AdminChartDataPoint = { month };
    for (const [group, count] of monthMap) {
      point[group] = count;
    }
    return point;
  });
}

/**
 * @description Fetches aggregate dashboard statistics. All 16 counts are
 * returned in a single response so tab switches require no additional fetch.
 * When site restrictions are provided, counts are scoped to those sites.
 *
 * @param siteRestrictions - Optional site IDs from ADMIN permissions. Undefined means unrestricted.
 * @returns All admin dashboard stats.
 */
export async function getAdminStats(
  siteRestrictions?: string[],
): Promise<AdminStats> {
  const userWhere: Prisma.UserWhereInput = siteRestrictions
    ? { siteId: { in: siteRestrictions } }
    : {};

  const siteWhere: Prisma.SiteWhereInput = siteRestrictions
    ? { id: { in: siteRestrictions } }
    : {};

  const studyWhere: Prisma.StudyWhereInput = siteRestrictions
    ? { siteStudies: { some: { siteId: { in: siteRestrictions } } } }
    : {};

  const auditWhere: Prisma.AuditLogWhereInput = siteRestrictions
    ? { siteId: { in: siteRestrictions } }
    : {};

  const videoStudyWhere: Prisma.VideoStudyWhereInput = siteRestrictions
    ? { siteId: { in: siteRestrictions } }
    : {};

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const [
    totalUsers,
    activeUsers,
    deactivatedUsers,
    newUsersThisMonth,
    totalSites,
    totalStudies,
    studiesNotStarted,
    studiesInProgress,
    studiesFinished,
    totalAuditActions,
    auditCreates,
    auditUpdates,
    auditDeletes,
    totalVideos,
    pendingReviews,
  ] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: { ...userWhere, isDeactivated: false } }),
    prisma.user.count({ where: { ...userWhere, isDeactivated: true } }),
    prisma.user.count({
      where: { ...userWhere, createdAt: { gte: startOfMonth } },
    }),
    prisma.site.count({ where: siteWhere }),
    prisma.study.count({ where: studyWhere }),
    prisma.study.count({ where: { ...studyWhere, status: "NOT_STARTED" } }),
    prisma.study.count({ where: { ...studyWhere, status: "IN_PROGRESS" } }),
    prisma.study.count({ where: { ...studyWhere, status: "FINISHED" } }),
    prisma.auditLog.count({ where: auditWhere }),
    prisma.auditLog.count({ where: { ...auditWhere, actionType: "CREATE" } }),
    prisma.auditLog.count({ where: { ...auditWhere, actionType: "UPDATE" } }),
    prisma.auditLog.count({ where: { ...auditWhere, actionType: "DELETE" } }),
    prisma.video.count({
      where: siteRestrictions
        ? { videoStudies: { some: { siteId: { in: siteRestrictions } } } }
        : {},
    }),
    prisma.videoStudy.count({
      where: { ...videoStudyWhere, reviewStatus: "NOT_REVIEWED" },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    deactivatedUsers,
    newUsersThisMonth,
    totalSites,
    totalStudies,
    studiesNotStarted,
    studiesInProgress,
    studiesFinished,
    totalAuditActions,
    auditCreates,
    auditUpdates,
    auditDeletes,
    totalVideos,
    pendingReviews,
  };
}

/**
 * @description Fetches time-series chart data for the given tab. Records are
 * fetched via Prisma and aggregated by month in JavaScript. For stacked
 * charts (studies, audits), records are also grouped by a secondary field.
 *
 * @param query - Parsed chart query params (tab, months).
 * @param siteRestrictions - Optional site IDs from ADMIN permissions.
 * @returns Chart response with monthly data points.
 */
export async function getAdminChart(
  query: AdminChartQuery,
  siteRestrictions?: string[],
): Promise<AdminChartResponse> {
  const startDate = getStartDate(query.months);

  switch (query.tab) {
    case "users": {
      const userWhere: Prisma.UserWhereInput = {
        createdAt: { gte: startDate },
        ...(siteRestrictions ? { siteId: { in: siteRestrictions } } : {}),
      };
      const records = await prisma.user.findMany({
        where: userWhere,
        select: { createdAt: true },
      });
      return { data: aggregateByMonth(records, query.months) };
    }

    case "sites": {
      const siteWhere: Prisma.SiteWhereInput = {
        createdAt: { gte: startDate },
        ...(siteRestrictions ? { id: { in: siteRestrictions } } : {}),
      };
      const records = await prisma.site.findMany({
        where: siteWhere,
        select: { createdAt: true },
      });
      return { data: aggregateByMonth(records, query.months) };
    }

    case "studies": {
      const studyWhere: Prisma.StudyWhereInput = {
        createdAt: { gte: startDate },
        ...(siteRestrictions
          ? { siteStudies: { some: { siteId: { in: siteRestrictions } } } }
          : {}),
      };
      const records = await prisma.study.findMany({
        where: studyWhere,
        select: { createdAt: true, status: true },
      });
      return {
        data: aggregateByMonthAndGroup(records, "status", query.months),
      };
    }

    case "audits": {
      const auditWhere: Prisma.AuditLogWhereInput = {
        createdAt: { gte: startDate },
        ...(siteRestrictions ? { siteId: { in: siteRestrictions } } : {}),
      };
      const records = await prisma.auditLog.findMany({
        where: auditWhere,
        select: { createdAt: true, actionType: true },
      });
      return {
        data: aggregateByMonthAndGroup(records, "actionType", query.months),
      };
    }
  }
}
