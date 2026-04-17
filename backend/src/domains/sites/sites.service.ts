import prisma from "../../lib/prisma.js";
import type { CreateSiteInput } from "./sites.types.js";

/** @description Name of the default study auto-created for every new site. */
export const MISCELLANEOUS_STUDY_NAME = "Miscellaneous";

/**
 * @description Creates a new Site along with its per-site "Miscellaneous"
 * study in one transaction. Every site is guaranteed to have a
 * Miscellaneous study so uploads can default to it when the user does not
 * pick a specific study.
 *
 * @param input - The validated create-site payload.
 * @returns The created Site record and the id of its Miscellaneous study.
 */
export async function createSiteWithMiscellaneousStudy({ name }: CreateSiteInput) {
    return await prisma.$transaction(async (tx) => {
        const site = await tx.site.create({ data: { name } });
        const study = await tx.study.create({
            data: { name: MISCELLANEOUS_STUDY_NAME, status: "IN_PROGRESS" },
        });
        await tx.siteStudy.create({
            data: { studyId: study.id, siteId: site.id },
        });
        return { site, miscellaneousStudyId: study.id };
    });
}
