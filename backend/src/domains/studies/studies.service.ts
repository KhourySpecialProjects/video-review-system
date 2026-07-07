import type { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import { recordAudit } from "../audit/audit.service.js";
import { buildStudySnapshot } from "../audit/audit.snapshots.js";
import type { AuthenticatedAuditContext } from "../audit/audit.types.js";
import type {
  UserStudyOption,
  StudyListItem,
  ListStudiesResponse,
  SiteCaregiversResponse,
  EligibleStudyUser,
} from "@shared/study.js";
import type { z } from "zod";
import type {
  CreateStudyInput,
  ListStudiesQuery,
  UpdateStudyInput,
  AddStudyUsersInput,
  createStudyWithEnrollmentSchema,
} from "./studies.types.js";

type CreateStudyWithEnrollmentInput = z.infer<typeof createStudyWithEnrollmentSchema>;

/**
 * @description Lists the studies attached to the given site via the
 * SiteStudy junction. Used by the upload flow to populate the study
 * selector with every study available at the uploader's site (including
 * the site's auto-seeded "Miscellaneous" study).
 *
 * @param siteId - The site whose studies to list.
 * @returns The studies linked to the site, ordered by name.
 */
export async function listStudiesForSite(
  siteId: string,
): Promise<UserStudyOption[]> {
  return await prisma.study.findMany({
    where: { siteStudies: { some: { siteId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * @description Lists all studies with optional filters and pagination.
 * When site restrictions are provided, only studies linked to those sites
 * via the SiteStudy junction are returned.
 *
 * @param query - Parsed query params (siteId, status, name, limit, offset).
 * @param siteRestrictions - Optional site ID restriction from ADMIN permissions.
 * @returns Paginated list of studies with their linked sites.
 */
export async function listAllStudies(
  query: ListStudiesQuery,
  siteRestrictions?: string[],
): Promise<ListStudiesResponse> {
  const where: Prisma.StudyWhereInput = {};

  if (siteRestrictions !== undefined) {
    where.siteStudies = { some: { siteId: { in: siteRestrictions } } };
  }

  if (query.siteId) {
    where.siteStudies = { some: { siteId: query.siteId } };
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.name) {
    where.name = { contains: query.name, mode: "insensitive" };
  }

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        siteStudies: {
          select: { site: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.study.count({ where }),
  ]);

  return {
    studies: studies.map((study): StudyListItem => ({
      id: study.id,
      name: study.name,
      status: study.status,
      createdAt: study.createdAt.toISOString(),
      sites: study.siteStudies.map((ss) => ss.site),
    })),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * @description Creates a study and links it to the given site via the
 * SiteStudy junction in a single transaction.
 *
 * @param input - The validated study creation input
 * @param audit - Optional audit context for logging.
 * @returns The created study record
 */
export async function createStudy(
  input: CreateStudyInput,
  audit?: AuthenticatedAuditContext,
) {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.create({
      data: { name: input.name },
    });

    await tx.siteStudy.create({
      data: { studyId: study.id, siteId: input.siteId },
    });

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "CREATE",
        entityType: "STUDY",
        entityId: study.id,
        siteId: input.siteId,
        oldValues: {},
        newValues: buildStudySnapshot(study),
        ipAddress: audit.ipAddress,
      });
    }

    return study;
  });
}

/**
 * @description Returns caregivers at the specified sites. Used by the
 * create-study dialog to populate the caregiver picker based on
 * selected sites.
 *
 * @param siteIds - The site IDs to fetch caregivers from.
 * @returns Response with array of caregiver users.
 */
export async function getCaregiversForSites(
  siteIds: string[],
): Promise<SiteCaregiversResponse> {
  const users: EligibleStudyUser[] = await prisma.user.findMany({
    where: {
      siteId: { in: siteIds },
      role: "CAREGIVER",
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return { users };
}

/**
 * @description Creates a study linked to multiple sites and optionally
 * enrolls caregivers. When addAllCaregivers is true, all caregivers at
 * the selected sites are enrolled. Otherwise, only the specific
 * caregiverUserIds are enrolled.
 *
 * @param input - Validated creation input with siteIds and enrollment options.
 * @param audit - Optional audit context for logging.
 * @returns The created study record.
 */
export async function createStudyWithEnrollment(
  input: CreateStudyWithEnrollmentInput,
  audit?: AuthenticatedAuditContext,
) {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.create({
      data: { name: input.name },
    });

    await tx.siteStudy.createMany({
      data: input.siteIds.map((siteId) => ({ studyId: study.id, siteId })),
    });

    if (input.addAllCaregivers) {
      const caregivers = await tx.user.findMany({
        where: {
          siteId: { in: input.siteIds },
          role: "CAREGIVER",
        },
        select: { id: true },
      });

      if (caregivers.length > 0) {
        await tx.caregiverPatient.createMany({
          data: caregivers.map((c) => ({ studyId: study.id, userId: c.id })),
          skipDuplicates: true,
        });
      }
    } else if (input.caregiverUserIds.length > 0) {
      await tx.caregiverPatient.createMany({
        data: input.caregiverUserIds.map((userId) => ({
          studyId: study.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "CREATE",
        entityType: "STUDY",
        entityId: study.id,
        siteId: input.siteIds[0],
        oldValues: {},
        newValues: buildStudySnapshot(study),
        ipAddress: audit.ipAddress,
      });
    }

    return study;
  });
}

/**
 * @description Updates a study's name and/or status.
 *
 * @param studyId - The study to update.
 * @param input - Fields to update (name, status).
 * @returns The updated study record.
 * @throws {AppError} If the study does not exist.
 */
export async function updateStudy(
  studyId: string,
  input: UpdateStudyInput,
) {
  const study = await prisma.study.findUnique({ where: { id: studyId } });

  if (!study) {
    throw AppError.notFound("Study not found");
  }

  return prisma.study.update({
    where: { id: studyId },
    data: input,
  });
}

/**
 * @description Returns users eligible to be added to a study. Eligible
 * users are those whose site is linked to the study via SiteStudy, minus
 * any users already enrolled in the study via CaregiverPatient.
 *
 * @param studyId - The study to find eligible users for.
 * @returns Array of eligible users with id, name, email, and role.
 * @throws {AppError} If the study does not exist.
 */
export async function getEligibleUsersForStudy(studyId: string) {
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: {
      siteStudies: { select: { siteId: true } },
      caregiverPatients: { select: { userId: true } },
    },
  });

  if (!study) {
    throw AppError.notFound("Study not found");
  }

  const linkedSiteIds = study.siteStudies.map((ss) => ss.siteId);
  const enrolledUserIds = study.caregiverPatients.map((cp) => cp.userId);

  return prisma.user.findMany({
    where: {
      siteId: { in: linkedSiteIds },
      role: "CAREGIVER",
      id: { notIn: enrolledUserIds.length > 0 ? enrolledUserIds : ["_none_"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

/**
 * @description Adds multiple users to a study by creating CaregiverPatient
 * junction records. Skips users who are already enrolled.
 *
 * @param studyId - The study to add users to.
 * @param input - Object containing the userIds array.
 * @returns The number of users added.
 * @throws {AppError} If the study does not exist.
 */
export async function addUsersToStudy(
  studyId: string,
  input: AddStudyUsersInput,
) {
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { id: true },
  });

  if (!study) {
    throw AppError.notFound("Study not found");
  }

  const result = await prisma.caregiverPatient.createMany({
    data: input.userIds.map((userId) => ({ studyId, userId })),
    skipDuplicates: true,
  });

  return { added: result.count };
}

/**
 * @description Removes a user from a study by deleting the
 * CaregiverPatient junction record.
 *
 * @param studyId - The study to remove the user from.
 * @param userId - The user to remove.
 * @throws {AppError} If the enrollment does not exist.
 */
export async function removeUserFromStudy(
  studyId: string,
  userId: string,
) {
  const enrollment = await prisma.caregiverPatient.findUnique({
    where: { studyId_userId: { studyId, userId } },
  });

  if (!enrollment) {
    throw AppError.notFound("User is not enrolled in this study");
  }

  await prisma.caregiverPatient.delete({
    where: { studyId_userId: { studyId, userId } },
  });
}
