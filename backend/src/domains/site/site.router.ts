import { Router } from "express";
import { z } from "zod";
import * as siteService from "./site.service.js";
import { createSiteSchema } from "./site.types.js";
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
