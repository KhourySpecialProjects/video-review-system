/**
 * Minimal local-dev seed.
 *
 * The original 560-line seed was removed in the vmp-156 merge. This restores
 * just enough to log in on a fresh local database: one Site (User.siteId is a
 * required FK) and one SYSADMIN user with a credential account whose password
 * is hashed by Better Auth itself (so the normal login flow accepts it).
 *
 * Run with: `npx prisma db seed` (or `tsx prisma/seed.ts`).
 */
import { randomUUID } from "crypto";
import prisma from "../src/lib/prisma.js";
import { auth, seedDefaultPermission } from "../src/lib/auth.js";

const EMAIL = "admin@local.dev";
const PASSWORD = "password123";

async function main() {
  // User.siteId is required, so make sure a site exists first.
  let site = await prisma.site.findFirst();
  if (!site) {
    site = await prisma.site.create({ data: { name: "Local Dev Site" } });
    console.log(`Created site: ${site.name} (${site.id})`);
  }

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`Seed user already exists: ${EMAIL}`);
    return;
  }

  // Hash the password with Better Auth's own hasher so login validates.
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(PASSWORD);

  const userId = randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      name: "Local Admin",
      email: EMAIL,
      emailVerified: true,
      role: "SYSADMIN",
      siteId: site.id,
      updatedAt: new Date(),
    },
  });

  // Better Auth credential accounts use providerId "credential" and set
  // accountId to the user's id.
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });

  // Grant the SYSADMIN their default global ADMIN permission row. The normal
  // onboarding flow does this via seedDefaultPermission; the list endpoints
  // (/domain/reviews, /domain/videos) gate on getPermissionRows, so without a
  // row even a SYSADMIN gets 403. Reuse the app's own logic to stay in sync.
  await seedDefaultPermission(userId, "SYSADMIN", site.id);

  console.log("─".repeat(50));
  console.log(`Seeded SYSADMIN user:`);
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
  console.log("─".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
