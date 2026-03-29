import { Router } from "express";
import { z } from "zod";
import * as siteService from "./site.service.js";
import { createSiteSchema } from "./site.types.js";
import { AppError } from "../../middleware/errors.js";

const router = Router();

// create site
router.post("/", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }
    const parsed = createSiteSchema.parse(req.body);
    const site = await siteService.createSite(parsed);
    res.status(201).json(site);
});

// delete site
router.delete("/:id", async (req, res) => {
    const adminSecret = req.headers["admin-secret"];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw AppError.unauthorized();
    }
    const { id } = z.object({ id: z.uuid("Invalid site ID") }).parse(req.params);
    await siteService.deleteSite(id);
    res.status(204).send();
});

export default router;
