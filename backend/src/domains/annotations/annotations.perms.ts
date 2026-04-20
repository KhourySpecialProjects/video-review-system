import prisma from "../../lib/prisma.js";
import { createDirectContextResolver, createBodyContextResolver } from "../../lib/auth.js";
import type { Request } from "express";

export const resolveAnnotationContexts = createDirectContextResolver("annotation");
export const resolveAnnotationContextsFromBody = createBodyContextResolver();

/**
 * Resolves the author ID of an annotation for ownership checks.
 */
export async function resolveAnnotationOwnerId(req: Request): Promise<string | null> {
  const annotation = await prisma.annotation.findUnique({
    where: { id: req.params.id as string },
    select: { authorUserId: true },
  });
  return annotation?.authorUserId ?? null;
}