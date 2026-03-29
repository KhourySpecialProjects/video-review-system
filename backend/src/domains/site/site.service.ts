import prisma from "../../lib/prisma.js";
import type { CreateSiteInput } from "./site.types.js";

// create site
export async function createSite(data: CreateSiteInput) {
  const site = await prisma.site.create({
    data: {
      name: data.name,
    },
  });
  return site;
}

// delete site
export async function deleteSite(id: string) {
  await prisma.site.delete({
    where: { id },
  });
}
