import prisma from "../../lib/prisma.js";
import type { CreateSiteInput } from "./site.types.js";

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
