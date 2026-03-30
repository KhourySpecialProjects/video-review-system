import { Router } from "express";
import { z } from "zod";
import * as siteService from "./site.service.js";
import { createSiteSchema, getSitesSchema } from "./site.types.js";
import { AppError } from "../../middleware/errors.js";

/**
 * Site router for managing review sites.
 * Handles site creation and deletion (admin-only).
 */
const router = Router();

/**
 * POST / - Create a new review site (admin-only)
 *
 * @header admin-secret - Required. Must match ADMIN_SECRET env var.
 * @body {CreateSiteInput} - { name: string }
 *
 * @returns {object} 201 - Site object
 * @throws {AppError} 400 - { error: string } on validation or service error
 * @throws {AppError} 401 - { error: "Unauthorized" } if admin-secret invalid
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.post("/", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }

    // Parse and validate request body at the HTTP boundary
    // Throws ZodError on failure — caught by errorHandler
    const parsed = createSiteSchema.parse(req.body);
    const site = await siteService.createSite(parsed);
    res.status(201).json(site);
});

/**
 * GET / - Get a list of review sites
 *
 * @query {string} [userId] - Optional. Filter sites to only those accessible by this user.
 *
 * @returns {object[]} 200 - Array of Site objects
 * @throws {AppError} 400 - { error: string } on validation error
 */
router.get("/", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }

    // Parse and validate query parameters at the HTTP boundary
    // Throws ZodError on failure — caught by errorHandler
    const parsed = getSitesSchema.parse(req.query);
    const sites = await siteService.getSites(parsed);
    res.status(200).json(sites);
});

/**
 * GET /:id - Get a specific review site with statistics (admin-only)
 *
 * @header admin-secret - Required. Must match ADMIN_SECRET env var.
 * @param {string} id - The ID of the site
 *
 * @returns {object} 200 - Site object with stats (userCount, patientCount, studyCount)
 * @throws {AppError} 400 - { error: string } on validation error
 * @throws {AppError} 401 - { error: "Unauthorized" } if admin-secret invalid
 * @throws {AppError} 404 - { error: string } if site not found
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.get("/:id", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }

    // Parse and validate request params at the HTTP boundary
    // Throws ZodError on failure — caught by errorHandler
    const { id } = z.object({ id: z.uuid("Invalid site ID") }).parse(req.params);

    const site = await siteService.getSiteWithStats(id);
    if (!site) {
        throw AppError.notFound("Site not found");
    }

    res.status(200).json(site);
});

/**
 * DELETE /:id - Delete an existing review site (admin-only)
 *
 * @header admin-secret - Required. Must match ADMIN_SECRET env var.
 * @param {string} id - The ID of the site to delete
 *
 * @returns {void} 204 - No content
 * @throws {AppError} 400 - { error: string } on validation error
 * @throws {AppError} 401 - { error: "Unauthorized" } if admin-secret invalid
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.delete("/:id", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }

    // Parse and validate request params at the HTTP boundary
    // Throws ZodError on failure — caught by errorHandler
    const { id } = z.object({ id: z.uuid("Invalid site ID") }).parse(req.params);
    await siteService.deleteSite(id);
    res.status(204).send();
});

export default router;
