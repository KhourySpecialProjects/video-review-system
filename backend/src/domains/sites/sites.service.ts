import type { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  buildSiteSnapshot,
  buildStudySnapshot,
} from "../audit/audit.snapshots.js";
import type { AuthenticatedAuditContext } from "../audit/audit.types.js";
import type { CreateSiteInput, ListSitesQuery } from "./sites.types.js";
import type {
  SiteListItem,
  ListSitesResponse,
  SiteDetailResponse,
  SiteOption,
} from "@shared/site.js";

/** @description Name of the default study auto-created for every new site. */
export const MISCELLANEOUS_STUDY_NAME = "Miscellaneous";

/**
 * @description Lists sites with optional name filter and pagination.
 * Includes user count, study count, and coordinator name for each site.
 *
 * @param query - Parsed list query params.
 * @param siteRestrictions - Optional site ID restriction for coordinators.
 * @returns Paginated list of sites.
 */
export async function listSites(
  query: ListSitesQuery,
  siteRestrictions?: string[],
): Promise<ListSitesResponse> {
  const where: Prisma.SiteWhereInput = {};

  if (siteRestrictions !== undefined) {
    where.id = { in: siteRestrictions };
  }

  if (query.name) {
    where.name = { contains: query.name, mode: "insensitive" };
  }

  const [sites, total] = await Promise.all([
    prisma.site.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, siteStudies: true } },
        users: {
          where: { role: "SITE_COORDINATOR" },
          select: { name: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.site.count({ where }),
  ]);

  return {
    sites: sites.map((site): SiteListItem => ({
      id: site.id,
      name: site.name,
      createdAt: site.createdAt.toISOString(),
      userCount: site._count.users,
      studyCount: site._count.siteStudies,
      coordinatorName: site.users[0]?.name ?? null,
    })),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * @description Returns a minimal list of sites for dropdown selects.
 *
 * @param siteRestrictions - Optional site ID restriction for coordinators.
 * @returns Array of site id/name pairs.
 */
export async function listSiteOptions(
  siteRestrictions?: string[],
): Promise<SiteOption[]> {
  return prisma.site.findMany({
    where: siteRestrictions ? { id: { in: siteRestrictions } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * @description Fetches detailed information for a single site including
 * its users and studies.
 *
 * @param siteId - The site to fetch.
 * @returns Detailed site response.
 * @throws {AppError} If the site does not exist.
 */
export async function getSiteDetail(
  siteId: string,
): Promise<SiteDetailResponse> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isDeactivated: true,
        },
        orderBy: { name: "asc" },
      },
      siteStudies: {
        select: {
          study: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });

  if (!site) {
    throw AppError.notFound("Site not found");
  }

  return {
    id: site.id,
    name: site.name,
    createdAt: site.createdAt.toISOString(),
    users: site.users,
    studies: site.siteStudies.map((ss) => ss.study),
  };
}

/**
 * @description Removes the link between a study and a site by deleting
 * the SiteStudy junction record. Does not delete the study itself.
 *
 * @param siteId - The site to unlink the study from.
 * @param studyId - The study to unlink.
 * @throws {AppError} If the junction record does not exist.
 */
export async function unlinkStudyFromSite(
  siteId: string,
  studyId: string,
): Promise<void> {
  const junction = await prisma.siteStudy.findUnique({
    where: { studyId_siteId: { studyId, siteId } },
  });

  if (!junction) {
    throw AppError.notFound("Study is not linked to this site");
  }

  await prisma.siteStudy.delete({
    where: { studyId_siteId: { studyId, siteId } },
  });
}

/**
 * @description Creates a new Site along with its per-site "Miscellaneous"
 * study in one transaction. Every site is guaranteed to have a
 * Miscellaneous study so uploads can default to it when the user does not
 * pick a specific study.
 *
 * @param input - The validated create-site payload.
 * @param audit - Audit context from the authenticated request.
 * @returns The created Site record and the id of its Miscellaneous study.
 */
export async function createSiteWithMiscellaneousStudy(
  { name }: CreateSiteInput,
  audit?: AuthenticatedAuditContext,
) {
  return await prisma.$transaction(async (tx) => {
    const site = await tx.site.create({ data: { name } });
    const study = await tx.study.create({
      data: { name: MISCELLANEOUS_STUDY_NAME, status: "IN_PROGRESS" },
    });
    await tx.siteStudy.create({
      data: { studyId: study.id, siteId: site.id },
    });

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "CREATE",
        entityType: "SITE",
        entityId: site.id,
        siteId: site.id,
        oldValues: {},
        newValues: buildSiteSnapshot(site),
        ipAddress: audit.ipAddress,
      });

      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "CREATE",
        entityType: "STUDY",
        entityId: study.id,
        siteId: site.id,
        oldValues: {},
        newValues: buildStudySnapshot(study),
        ipAddress: audit.ipAddress,
      });
    }

    return { site, miscellaneousStudyId: study.id };
  });
}
