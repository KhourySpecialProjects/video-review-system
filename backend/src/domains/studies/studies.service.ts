import prisma from "../../lib/prisma.js";
import type { UserStudyOption } from "@shared/study.js";
import type { CreateStudyInput } from "./studies.types.js";

/**
 * @description Lists the studies attached to the given site via the
 * SiteStudy junction. Used by the upload flow to populate the study
 * selector with every study available at the uploader's site (including
 * the site's auto-seeded "Miscellaneous" study).
 *
 * @param siteId - The site whose studies to list.
 * @returns The studies linked to the site, ordered by name.
 */
export async function listStudiesForSite(siteId: string): Promise<UserStudyOption[]> {
    return await prisma.study.findMany({
        where: { siteStudies: { some: { siteId } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}

/**
 * @description Creates a study and links it to the given site via the
 * SiteStudy junction in a single transaction.
 *
 * @param input - The validated study creation input
 * @returns The created study record
 */
export async function createStudy(input: CreateStudyInput) {
    return prisma.$transaction(async (tx) => {
        const study = await tx.study.create({
            data: { name: input.name },
        });

        await tx.siteStudy.create({
            data: { studyId: study.id, siteId: input.siteId },
        });

        return study;
    });
}
