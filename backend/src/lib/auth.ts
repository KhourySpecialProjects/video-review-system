import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { permission_level } from "../generated/prisma/client.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

import type { user_role } from "../generated/prisma/client.js";
import type { Request } from "express";

// configure Better Auth instance
// this is the core auth engine that handles sessions, sign-in, and password hashing
export const auth = betterAuth({
  // use Prisma as the database adapter for storing users, sessions, accounts
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // expose custom User columns so they are included in session responses
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
      siteId: {
        type: "string",
        input: false,
      },
    },
  },

  // enable email/password authentication
  // disableSignUp: true means users can only be created via our invite flow
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: send a real email in production
      console.log(`[DEV-ONLY] Password reset link for ${user.email}: ${url}`);
    },
  },

  // allow requests from the frontend origin for CORS
  trustedOrigins: process.env.ALLOWED_ORIGIN?.split(",") || ["https://localhost:5173"],
});

/** Inferred session type including custom user fields (role). */
export type Session = typeof auth.$Infer.Session;


// ────────────────────────────────────────────────────────────
// Authorization logic: functions to check permissions and build query filters
//
// Access model:
//   SYSADMIN            → full access to everything
//   SITE_COORDINATOR    → full governance over their site within their studies
//   CLINICAL_REVIEWER   → read videos + create annotations/notes in their site & study
//   CAREGIVER           → read, write, export their OWN videos in their site & study
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// Constants & Types
// ────────────────────────────────────────────────────────────
 
/**
 * Numeric ranking of each permission level, used for comparing
 * the strength of grants. Higher numbers represent broader access.
 *
 * The hierarchy is cumulative: a user with ADMIN implicitly satisfies
 * any check for EXPORT, WRITE, or READ.
 *
 * @example
 * ```ts
 * PERMISSION_RANK["ADMIN"] > PERMISSION_RANK["READ"] // true → ADMIN satisfies READ
 * ```
 */
export const PERMISSION_RANK: Record<permission_level, number> = {
  READ: 1,
  WRITE: 2,
  EXPORT: 3,
  ADMIN: 4,
};
 
/**
 * Represents the scope tuple for a resource being accessed.
 *
 * Each field narrows the scope:
 * - All `null` → global scope (matches everything)
 * - Only `siteId` set → site-wide scope
 * - Only `studyId` set → study-wide scope
 * - Only `videoId` set → single video scope
 *
 * These are passed into permission checks so that wildcard permission
 * rows (with NULL fields) can match against concrete resource scopes.
 *
 * @property studyId - The study the resource belongs to, or null if not study-scoped
 * @property siteId  - The site the resource belongs to, or null if not site-scoped
 * @property videoId - The specific video, or null if not video-scoped
 */
export interface ResourceContext {
  studyId: string | null;
  siteId: string | null;
  videoId: string | null;
}
 
/**
 * Returns all permission levels whose rank is greater than or equal to
 * the given level.
 *
 * Used in database queries to find permission rows that satisfy a minimum
 * requirement. For example, if the required level is WRITE, this returns
 * `['WRITE', 'EXPORT', 'ADMIN']` so that stronger grants also match.
 *
 * @param level - The minimum permission level required
 * @returns An array of permission levels that satisfy the requirement
 *
 * @example
 * ```ts
 * levelsAtOrAbove("WRITE") // → ["WRITE", "EXPORT", "ADMIN"]
 * levelsAtOrAbove("ADMIN") // → ["ADMIN"]
 * ```
 */
export function levelsAtOrAbove(level: permission_level): permission_level[] {
  const threshold = PERMISSION_RANK[level];
  return Object.entries(PERMISSION_RANK)
    .filter(([, rank]) => rank >= threshold)
    .map(([lvl]) => lvl as permission_level);
}
 
// ────────────────────────────────────────────────────────────
// Single-Resource Checks
// ────────────────────────────────────────────────────────────
 
/**
 * Checks whether a user has at least `requiredLevel` permission for
 * any of the given resource contexts.
 *
 * ## Matching logic
 *
 * A permission row's NULL field acts as a wildcard — it matches any value
 * on the resource side. A non-NULL field must match the resource's value exactly.
 *
 * For each context, the query effectively evaluates:
 * ```sql
 * WHERE (p.study_id IS NULL OR p.study_id = :resource.studyId)
 *   AND (p.site_id  IS NULL OR p.site_id  = :resource.siteId)
 *   AND (p.video_id IS NULL OR p.video_id = :resource.videoId)
 *   AND p.permission_level IN (:levelsAtOrAbove)
 * ```
 *
 * ## Multiple contexts
 *
 * An array of contexts is accepted because a single resource (e.g. a video)
 * can belong to multiple studies via the `VideoStudy` junction table. Access
 * is granted if the user has a matching permission for **any** of the contexts.
 *
 * ## Caregiver handling
 *
 * Caregivers always return `false`. Their access is purely ownership-based
 * (they can only see videos they uploaded) and is handled separately in
 * the middleware layer via a dedicated caregiver check callback.
 *
 * @param userId        - The ID of the user to check
 * @param role          - The user's role (CAREGIVER short-circuits to false)
 * @param requiredLevel - The minimum permission level needed (e.g. "READ", "WRITE")
 * @param contexts      - One or more resource scope tuples to check against
 * @returns `true` if at least one permission row matches; `false` otherwise
 *
 * @example
 * ```ts
 * // Check if user can read a video that belongs to study_17 at site_b
 * const allowed = await checkPermission(userId, "CLINICAL_REVIEWER", "READ", [
 *   { studyId: "study_17", siteId: "site_b", videoId: "video_x" }
 * ]);
 * ```
 */
export async function checkPermission(
  userId: string,
  role: user_role,
  requiredLevel: permission_level,
  contexts: ResourceContext[]
): Promise<boolean> {
  if (role === "CAREGIVER") return false;
  if (role === "SYSADMIN") return true; // SYSADMIN bypasses all checks
  if (contexts.length === 0) return false;
 
  const qualifyingLevels = levelsAtOrAbove(requiredLevel);
 
  // Build one OR branch per context. Each branch uses the
  // "IS NULL OR = :value" pattern so wildcard rows match.
  const contextFilters = contexts.map((ctx) => ({
    AND: [
      { OR: [{ studyId: null }, ...(ctx.studyId ? [{ studyId: ctx.studyId }] : [])] },
      { OR: [{ siteId: null }, ...(ctx.siteId ? [{ siteId: ctx.siteId }] : [])] },
      { OR: [{ videoId: null }, ...(ctx.videoId ? [{ videoId: ctx.videoId }] : [])] },
    ],
  }));
 
  const match = await prisma.userPermission.findFirst({
    where: {
      userId,
      permissionLevel: { in: qualifyingLevels },
      OR: contextFilters,
    },
  });
 
  return match !== null;
}
 
/**
 * Returns the highest (strongest) permission level the user holds across
 * all matching rows for the given resource contexts.
 *
 * Unlike {@link checkPermission} which answers a yes/no question, this
 * function is used when you need to know the **degree** of access — most
 * commonly to distinguish WRITE from ADMIN in the ownership check:
 *
 * - WRITE users can only edit/delete their **own** annotations, clips, sequences.
 * - ADMIN users can edit/delete **anyone's** resources.
 *
 * Uses `findMany` (not `findFirst`) because it must compare all matching
 * rows to find the strongest grant.
 *
 * @param userId   - The ID of the user to check
 * @param role     - The user's role (CAREGIVER short-circuits to null)
 * @param contexts - One or more resource scope tuples to check against
 * @returns The strongest matching `permission_level`, or `null` if no rows match
 *
 * @example
 * ```ts
 * const highest = await getHighestPermission(userId, "SITE_COORDINATOR", [
 *   { studyId: "study_17", siteId: "site_b", videoId: null }
 * ]);
 * // highest === "ADMIN" → skip ownership check
 * // highest === "WRITE" → enforce ownership
 * ```
 */
export async function getHighestPermission(
  userId: string,
  role: user_role,
  contexts: ResourceContext[]
): Promise<permission_level | null> {
  if (role === "CAREGIVER") return null;
  if (role === "SYSADMIN") return "ADMIN"; // SYSADMIN has the highest permission level
  if (contexts.length === 0) return null;
 
  const contextFilters = contexts.map((ctx) => ({
    AND: [
      { OR: [{ studyId: null }, ...(ctx.studyId ? [{ studyId: ctx.studyId }] : [])] },
      { OR: [{ siteId: null }, ...(ctx.siteId ? [{ siteId: ctx.siteId }] : [])] },
      { OR: [{ videoId: null }, ...(ctx.videoId ? [{ videoId: ctx.videoId }] : [])] },
    ],
  }));
 
  const grants = await prisma.userPermission.findMany({
    where: {
      userId,
      OR: contextFilters,
    },
    select: { permissionLevel: true },
  });
 
  if (grants.length === 0) return null;
 
  return grants.reduce((best, g) =>
    PERMISSION_RANK[g.permissionLevel] > PERMISSION_RANK[best.permissionLevel] ? g : best
  ).permissionLevel;
}
 
// ────────────────────────────────────────────────────────────
// List Filter Builders
// ────────────────────────────────────────────────────────────
 
/**
 * Fetches all `UserPermission` rows for a user at or above the required
 * level and returns them as raw {@link ResourceContext} tuples.
 *
 * This is the shared foundation for both {@link buildDirectAccessFilter}
 * and {@link buildVideoAccessFilter}. Each tuple represents one grant
 * whose scope will be converted into a Prisma `where` clause by the
 * calling wrapper.
 *
 * @param userId - The ID of the user
 * @param level  - The minimum permission level to include
 * @returns An array of scope tuples from matching permission rows
 *
 * @example
 * ```ts
 * // Jane has: ADMIN on site_a, WRITE on study_17
 * const conditions = await getPermissionConditions("u_42", "READ");
 * // → [
 * //   { studyId: null, siteId: "site_a", videoId: null },   // ADMIN ≥ READ ✓
 * //   { studyId: "study_17", siteId: null, videoId: null },  // WRITE ≥ READ ✓
 * // ]
 * ```
 */
export async function getPermissionConditions(
  userId: string,
  level: permission_level
): Promise<ResourceContext[]> {
  const qualifyingLevels = levelsAtOrAbove(level);
 
  const rows = await prisma.userPermission.findMany({
    where: {
      userId,
      permissionLevel: { in: qualifyingLevels },
    },
    select: { studyId: true, siteId: true, videoId: true },
  });
 
  return rows.map((r) => ({
    studyId: r.studyId,
    siteId: r.siteId,
    videoId: r.videoId,
  }));
}
 
/**
 * Builds a Prisma `where` clause for models that have `studyId`, `siteId`,
 * and `videoId` columns directly on the table — annotations, clips, and sequences.
 *
 * Each permission row from {@link getPermissionConditions} is converted into
 * a Prisma filter object. NULL fields in the permission row are **omitted**
 * from the clause, which means Prisma won't filter on that column — achieving
 * the wildcard behavior.
 *
 * ## Examples of conversion
 *
 * | Permission row                        | Prisma clause                  | Effect                    |
 * |---------------------------------------|--------------------------------|---------------------------|
 * | `{ siteId: "site_a", else null }`     | `{ siteId: "site_a" }`        | All records at site_a     |
 * | `{ studyId: "s9", else null }`        | `{ studyId: "s9" }`           | All records in study 9    |
 * | `{ all null }` (global admin)         | `{}`                           | All records (no filter)   |
 *
 * ## Caregiver handling
 *
 * Caregivers cannot access annotations, clips, or sequences, so this returns
 * an impossible filter (`{ id: "000..." }`) that matches zero rows.
 *
 * @param userId       - The ID of the user
 * @param role         - The user's role
 * @param level        - The minimum permission level required for the list operation
 * @param options      - Optional overrides
 * @param options.videoIdField - Column name for the video FK if not `"videoId"`
 *                               (e.g. `"sourceVideoId"` for clips)
 * @returns A Prisma-compatible `where` object to merge into your query
 *
 * @example
 * ```ts
 * // In an annotations list endpoint:
 * const accessFilter = await buildDirectAccessFilter(userId, role, "READ");
 * const annotations = await prisma.annotation.findMany({
 *   where: { videoId, ...accessFilter },
 * });
 *
 * // In a clips list endpoint (different video column name):
 * const accessFilter = await buildDirectAccessFilter(userId, role, "READ", {
 *   videoIdField: "sourceVideoId",
 * });
 * ```
 */
export async function buildDirectAccessFilter(
  userId: string,
  role: user_role,
  level: permission_level,
  options?: { videoIdField?: string }
): Promise<Record<string, any>> {
  const videoField = options?.videoIdField ?? "videoId";
 
  if (role === "CAREGIVER") {
    // Caregivers can't access annotations/clips/sequences
    return { id: "00000000-0000-0000-0000-000000000000" }; // impossible match
  }
 
  const conditions = await getPermissionConditions(userId, level);
 
  if (conditions.length === 0) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
 
  const orClauses = conditions.map((c) => {
    const clause: Record<string, any> = {};
    if (c.studyId !== null) clause.studyId = c.studyId;
    if (c.siteId !== null) clause.siteId = c.siteId;
    if (c.videoId !== null) clause[videoField] = c.videoId;
    // NULL fields are omitted → no constraint → wildcard
    return clause;
  });
 
  return { OR: orClauses };
}
 
/**
 * Builds a Prisma `where` clause for listing videos.
 *
 * Videos don't have `studyId` or `siteId` directly on the `Video` model —
 * the link goes through the `VideoStudy` junction table. So permission
 * conditions are wrapped in `{ videoStudies: { some: { ... } } }` to
 * filter through the junction.
 *
 * ## Special cases
 *
 * - **Caregivers**: returns `{ uploadedByUserId: userId }` — they only
 *   see their own uploads, bypassing the permission table entirely.
 * - **Global admin** (all-null permission row): returns an empty `{}`
 *   inside the OR, which matches all videos with no junction filter.
 * - **No matching permissions**: returns an impossible filter.
 *
 * @param userId - The ID of the user
 * @param role   - The user's role
 * @param level  - The minimum permission level required
 * @returns A Prisma-compatible `where` object to merge into a video query
 *
 * @example
 * ```ts
 * const accessFilter = await buildVideoAccessFilter(userId, role, "READ");
 * const videos = await prisma.video.findMany({
 *   where: { status: "UPLOADED", ...accessFilter },
 * });
 * ```
 */
export async function buildVideoAccessFilter(
  userId: string,
  role: user_role,
  level: permission_level
): Promise<Record<string, any>> {
  if (role === "CAREGIVER") {
    return { uploadedByUserId: userId };
  }
 
  const conditions = await getPermissionConditions(userId, level);
 
  if (conditions.length === 0) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
 
  const orClauses = conditions.map((c) => {
    // If all NULLs (global admin), no filter needed — matches everything
    if (c.studyId === null && c.siteId === null && c.videoId === null) {
      return {};
    }
 
    const junction: Record<string, any> = {};
    if (c.studyId !== null) junction.studyId = c.studyId;
    if (c.siteId !== null) junction.siteId = c.siteId;
    if (c.videoId !== null) junction.videoId = c.videoId;
 
    return { videoStudies: { some: junction } };
  });
 
  return { OR: orClauses };
}
 
// ────────────────────────────────────────────────────────────
// Context Resolver Factories
// ────────────────────────────────────────────────────────────
 
/**
 * Factory that creates a context resolver for GET, PUT, and DELETE routes
 * on models with direct `studyId`, `siteId`, and `videoId` columns.
 *
 * The returned function fetches the resource by `req.params.id` and extracts
 * its scope tuple as a {@link ResourceContext}. This avoids duplicating the
 * same fetch-and-extract pattern across every domain's perms file.
 *
 * @param model    - The Prisma model name to query
 * @param fieldMap - Optional column name overrides when the video FK isn't called `videoId`
 * @param fieldMap.videoId - The column name for the video foreign key
 *                           (e.g. `"sourceVideoId"` for the `videoClip` model)
 * @returns An async function `(req: Request) => Promise<ResourceContext[]>`
 *
 * @example
 * ```ts
 * // annotations.perms.ts — videoId column is standard
 * export const resolveAnnotationContexts = createDirectContextResolver("annotation");
 *
 * // clips.perms.ts — video FK is called "sourceVideoId"
 * export const resolveClipContexts = createDirectContextResolver("videoClip", {
 *   videoId: "sourceVideoId",
 * });
 * ```
 */
export function createDirectContextResolver(
  model: "annotation" | "videoClip" | "stitchedSequence",
  fieldMap?: { videoId?: string }
) {
  return async (req: Request): Promise<ResourceContext[]> => {
    const videoField = fieldMap?.videoId ?? "videoId";
    const record = await (prisma[model] as any).findUniqueOrThrow({
      where: { id: req.params.id },
      select: { studyId: true, siteId: true, [videoField]: true },
    });
    return [
      {
        studyId: record.studyId,
        siteId: record.siteId,
        videoId: record[videoField],
      },
    ];
  };
}
 
/**
 * Factory that creates a context resolver for POST routes where the
 * resource doesn't exist yet.
 *
 * The returned function reads `studyId`, `siteId`, and `videoId` from
 * `req.body` and returns them as a {@link ResourceContext}. Missing fields
 * default to `null`.
 *
 * @returns A synchronous function `(req: Request) => ResourceContext[]`
 *
 * @example
 * ```ts
 * // annotations.perms.ts
 * export const resolveAnnotationContextsFromBody = createBodyContextResolver();
 *
 * // Used in router:
 * router.post("/", requirePermission("WRITE", resolveAnnotationContextsFromBody), handler);
 * ```
 */
export function createBodyContextResolver() {
  return (req: Request): ResourceContext[] => [
    {
      studyId: req.body.studyId ?? null,
      siteId: req.body.siteId ?? null,
      videoId: req.body.videoId ?? null,
    },
  ];
}

/**
 * Creates the default permission row for a newly created user based on
 * their role. Called during user onboarding (signup or invitation acceptance).
 *
 * Default grants:
 *   - SYSADMIN → global ADMIN (all NULLs)
 *   - SITE_COORDINATOR → ADMIN scoped to their home site
 *   - CLINICAL_REVIEWER → no default row (permissions assigned by admin)
 *   - CAREGIVER → no default row (access is ownership-based, not permission-based)
 *
 * @param userId - The newly created user's ID
 * @param role   - The user's assigned role
 * @param siteId - The user's home site ID
 * @param tx     - Optional transaction client
 * 
 * @returns A promise that resolves when the permission row is created
 */
export async function seedDefaultPermission(
  userId: string,
  role: user_role,
  siteId: string,
  tx?: any // accepts either the transaction client or falls back to prisma
): Promise<void> {
  const db = tx ?? prisma;

  switch (role) {
    case "SYSADMIN":
      await db.userPermission.create({
        data: {
          userId,
          siteId: null,
          studyId: null,
          videoId: null,
          permissionLevel: "ADMIN",
        },
      });
      break;

    case "SITE_COORDINATOR":
      await db.userPermission.create({
        data: {
          userId,
          siteId,
          studyId: null,
          videoId: null,
          permissionLevel: "ADMIN",
        },
      });
      break;

    case "CLINICAL_REVIEWER":
    case "CAREGIVER":
      break;
  }
}