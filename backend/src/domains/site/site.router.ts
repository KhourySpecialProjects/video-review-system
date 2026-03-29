import { Router } from "express";
import * as siteService from "./site.service.js";
import { createSiteSchema } from "./site.types.js";

const router = Router();

// POST /domain/site - create site
router.post("/", async (req, res, next) => {
    try {
        const parsed = createSiteSchema.parse(req.body);
        const site = await siteService.createSite(parsed);
        res.status(201).json(site);
    } catch (err) {
        next(err);
    }
});

// DELETE /domain/site/:id - delete site
router.delete("/:id", async (req, res, next) => {
    try {
        await siteService.deleteSite(req.params.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;
