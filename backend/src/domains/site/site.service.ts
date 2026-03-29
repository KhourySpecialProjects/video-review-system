import prisma from "../../lib/prisma.js";
import { resource_type } from "../../generated/prisma/client.js";
import type { CreateSiteInput, GetSitesInput } from "./site.types.js";

/**
 * Creates a new review site.
 *
 * Stores the site in the database.
 *
 * @param data - The site details (name)
 * @returns The created site object
 * @throws {Error} If database operation fails
 */
export async function createSite(data: CreateSiteInput) {
    const site = await prisma.site.create({
        data: {
            name: data.name,
        },
    });
    return site;
}

/**
 * Deletes an existing review site.
 *
 * Removes the site from the database permanently.
 *
 * @param id - The ID of the site to delete
 * @throws {Error} If database operation fails or site not found
 */
export async function deleteSite(id: string) {
    await prisma.site.delete({
        where: { id },
    });
}

/**
 * Gets a list of review sites.
 * Can be filtered by userId to only return sites the user has access to.
 *
 * @param filters - The filter criteria (optional userId)
 * @returns Array of site objects
 * @throws {Error} If database operation fails
 */
export async function getSites(filters: GetSitesInput) {
    if (filters.userId) {
        // Find all site IDs the user has permission for
        const permissions = await prisma.userPermission.findMany({
            where: {
                userId: filters.userId,
                resourceType: resource_type.SITE,
            },
            select: {
                resourceId: true,
            },
        });
        
        const siteIds = permissions.map((p) => p.resourceId);

        return await prisma.site.findMany({
            where: {
                id: { in: siteIds },
            },
        });
    }

    // If no filters apply, fetch all sites
    return await prisma.site.findMany();
}
