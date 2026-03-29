import { Router } from "express";
import * as siteService from "./site.service.js";
import { createSiteSchema } from "./site.types.js";

const router = Router();

// create site
router.post("/", async (req, res) => {
    const parsed = createSiteSchema.parse(req.body);
    const site = await siteService.createSite(parsed);
    res.status(201).json(site);
});

// delete site
router.delete("/:id", async (req, res) => {
    await siteService.deleteSite(req.params.id);
    res.status(204).send();
});

export default router;
