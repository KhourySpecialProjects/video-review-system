import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean up existing data (order matters due to foreign keys)
  await prisma.sequenceItem.deleteMany();
  await prisma.stitchedSequence.deleteMany();
  await prisma.videoClip.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.caregiverVideoMetadata.deleteMany();
  await prisma.videoStudy.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.caregiverPatient.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.video.deleteMany();
  await prisma.siteStudy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.study.deleteMany();
  await prisma.site.deleteMany();
  await prisma.verification.deleteMany();

  console.log("🧹 Cleaned existing data\n");

  // ──────────────────────────────────────────────
  // 1. Sites
  // ──────────────────────────────────────────────
  const site1 = await prisma.site.create({
    data: {
      id: "a1111111-1111-4111-a111-111111111111",
      name: "Boston General",
    },
  });

  const site2 = await prisma.site.create({
    data: {
      id: "a1111111-1111-4111-a111-222222222222",
      name: "Chicago Memorial",
    },
  });

  console.log("✅ Sites created");

  // ──────────────────────────────────────────────
  // 2. Studies
  // ──────────────────────────────────────────────
  const study1 = await prisma.study.create({
    data: {
      id: "a2222222-2222-4222-a222-222222222222",
      name: "Sleep Study Alpha",
      status: "NOT_STARTED",
    },
  });

  const study2 = await prisma.study.create({
    data: {
      id: "a2222222-2222-4222-a222-333333333333",
      name: "Motor Skills Beta",
      status: "IN_PROGRESS",
    },
  });

  console.log("✅ Studies created");

  // ──────────────────────────────────────────────
  // 3. Users
  // ──────────────────────────────────────────────
  const alice = await prisma.user.create({
    data: {
      id: "user-caregiver-01",
      name: "Alice Smith",
      email: "alice@example.com",
      emailVerified: true,
      role: "CAREGIVER",
      siteId: site1.id,
      caregiverId: "CG-001",
      isDeactivated: false,
    },
  });

  const jeremy = await prisma.user.create({
    data: {
      id: "user-caregiver-02",
      name: "Jeremy Brown",
      email: "jeremy@example.com",
      emailVerified: true,
      role: "CAREGIVER",
      siteId: site2.id,
      caregiverId: "CG-002",
      isDeactivated: false,
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: "user-reviewer-01",
      name: "Bob Jones",
      email: "bob@example.com",
      emailVerified: true,
      role: "CLINICAL_REVIEWER",
      siteId: site1.id,
      isDeactivated: false,
    },
  });

  const carol = await prisma.user.create({
    data: {
      id: "user-coordinator-01",
      name: "Carol Davis",
      email: "carol@example.com",
      emailVerified: true,
      role: "SITE_COORDINATOR",
      siteId: site2.id,
      isDeactivated: false,
    },
  });

  const dan = await prisma.user.create({
    data: {
      id: "user-sysadmin-01",
      name: "Dan Admin",
      email: "dan@example.com",
      emailVerified: true,
      role: "SYSADMIN",
      siteId: site1.id,
      isDeactivated: false,
    },
  });

  console.log("✅ Users created");

  // ──────────────────────────────────────────────
  // 4. SiteStudy (link sites ↔ studies)
  // ──────────────────────────────────────────────
  await prisma.siteStudy.createMany({
    data: [
      { studyId: study1.id, siteId: site1.id },
      { studyId: study2.id, siteId: site1.id },
      { studyId: study2.id, siteId: site2.id },
    ],
  });

  console.log("✅ SiteStudy links created");

  // ──────────────────────────────────────────────
  // 5. Sessions (for auth testing)
  // ──────────────────────────────────────────────
  await prisma.session.create({
    data: {
      id: "session-alice-01",
      token: "tok_alice_test_session_001",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      updatedAt: new Date(),
      userId: alice.id,
      ipAddress: "127.0.0.1",
      userAgent: "PostmanRuntime/7.37",
    },
  });

  await prisma.session.create({
    data: {
      id: "session-jeremy-01",
      token: "tok_jeremy_test_session_001",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      updatedAt: new Date(),
      userId: jeremy.id,
      ipAddress: "127.0.0.1",
      userAgent: "PostmanRuntime/7.37",
    },
  });

  await prisma.session.create({
    data: {
      id: "session-bob-01",
      token: "tok_bob_test_session_001",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      userId: bob.id,
      ipAddress: "127.0.0.1",
      userAgent: "PostmanRuntime/7.37",
    },
  });

  console.log("✅ Sessions created");

  // ──────────────────────────────────────────────
  // 6. Accounts
  // ──────────────────────────────────────────────
  await prisma.account.create({
    data: {
      id: "account-alice-01",
      accountId: alice.id,
      providerId: "credential",
      userId: alice.id,
      password: "$2b$10$fakehashforseeding00000000000000000000000000",
      updatedAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      id: "account-jeremy-01",
      accountId: jeremy.id,
      providerId: "credential",
      userId: jeremy.id,
      password: "$2b$10$fakehashforseeding00000000000000000000000000",
      updatedAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      id: "account-bob-01",
      accountId: bob.id,
      providerId: "credential",
      userId: bob.id,
      password: "$2b$10$fakehashforseeding00000000000000000000000000",
      updatedAt: new Date(),
    },
  });

  console.log("✅ Accounts created");

  // ──────────────────────────────────────────────
  // 7. CaregiverPatient (caregiver ↔ study)
  // ──────────────────────────────────────────────
  await prisma.caregiverPatient.create({
    data: {
      studyId: study1.id,
      userId: alice.id,
    },
  });

  console.log("✅ CaregiverPatient links created");

  // ──────────────────────────────────────────────
  // 8. UserPermissions
  // ──────────────────────────────────────────────
  await prisma.userPermission.createMany({
    data: [
      {
        userId: alice.id,
        studyId: study1.id,
        siteId: site1.id,
        permissionLevel: "WRITE",
      },
      {
        userId: bob.id,
        studyId: study1.id,
        siteId: site1.id,
        permissionLevel: "ADMIN",
      },
      {
        userId: carol.id,
        studyId: study2.id,
        siteId: site2.id,
        permissionLevel: "EXPORT",
      },
    ],
  });

  console.log("✅ UserPermissions created");

  // ──────────────────────────────────────────────
  // 10. Videos
  // ──────────────────────────────────────────────
  const video1 = await prisma.video.create({
    data: {
      id: "a3333333-3333-4333-a333-333333333333",
      uploadedByUserId: alice.id,
      s3Key: "uploads/study1/patient44/video1.mp4",
      status: "UPLOADED",
      fileSize: BigInt(104857600), // 100 MB
      totalParts: 1,
      durationSeconds: 120,
      takenAt: new Date("2026-03-15T10:30:00Z"),
    },
  });

  const video2 = await prisma.video.create({
    data: {
      id: "a3333333-3333-4333-a333-444444444444",
      uploadedByUserId: alice.id,
      s3Key: "uploads/study1/patient44/video2.mp4",
      status: "UPLOADED",
      fileSize: BigInt(73400320), // ~70 MB
      totalParts: 1,
      durationSeconds: 85,
      takenAt: new Date("2026-03-20T14:00:00Z"),
    },
  });

  const video3 = await prisma.video.create({
    data: {
      id: "a3333333-3333-4333-a333-555555555555",
      uploadedByUserId: jeremy.id,
      s3Key: "uploads/study1/patient45/video3.mp4",
      status: "UPLOADED",
      fileSize: BigInt(73400320), // ~70 MB
      totalParts: 1,
      durationSeconds: 85,
      takenAt: new Date("2026-03-20T14:00:00Z"),
    },
  });

  console.log("✅ Videos created");

  // ──────────────────────────────────────────────
  // 11. CaregiverVideoMetadata
  // ──────────────────────────────────────────────
  await prisma.caregiverVideoMetadata.create({
    data: {
      videoId: video1.id,
      caregiverUserId: alice.id,
      privateTitle: "Morning session - good mobility",
      privateNotes: "Patient seemed well-rested. Noticed improved range of motion.",
    },
  });

  console.log("✅ CaregiverVideoMetadata created");

  // ──────────────────────────────────────────────
  // 12. VideoStudy
  // ──────────────────────────────────────────────
  await prisma.videoStudy.createMany({
    data: [
      {
        studyId: study1.id,
        siteId: site1.id,
        videoId: video1.id,
        reviewStatus: "IN_REVIEW",
        commentOverview: "Pending initial clinical review",
      },
      {
        studyId: study1.id,
        siteId: site1.id,
        videoId: video2.id,
        reviewStatus: "NOT_REVIEWED",
      },
    ],
  });

  console.log("✅ VideoStudy links created");

  // ──────────────────────────────────────────────
  // 13. Annotations
  // ──────────────────────────────────────────────
  const annotation1 = await prisma.annotation.create({
    data: {
      id: "a5555555-5555-4555-a555-555555555555",
      videoId: video1.id,
      authorUserId: bob.id,
      studyId: study1.id,
      siteId: site1.id,
      type: "text_comment",
      timestampS: 30,
      durationS: 5,
      payload: { text: "Notable tremor at this timestamp" },
    },
  });

  await prisma.annotation.create({
    data: {
      id: "a5555555-5555-4555-a555-666666666666",
      videoId: video1.id,
      authorUserId: bob.id,
      studyId: study1.id,
      siteId: site1.id,
      type: "drawing_box",
      timestampS: 45,
      durationS: 10,
      payload: { x: 120, y: 80, width: 200, height: 150, label: "Left hand region" },
    },
  });

  await prisma.annotation.create({
    data: {
      id: "a5555555-5555-4555-a555-777777777777",
      videoId: video1.id,
      authorUserId: bob.id,
      studyId: study1.id,
      siteId: site1.id,
      type: "tag",
      timestampS: 60,
      durationS: 0,
      payload: { tag: "follow-up-needed" },
    },
  });

  console.log("✅ Annotations created");

  // ──────────────────────────────────────────────
  // 14. VideoClips
  // ──────────────────────────────────────────────
  const clip1 = await prisma.videoClip.create({
    data: {
      id: "a6666666-6666-4666-a666-666666666666",
      sourceVideoId: video1.id,
      createdByUserId: bob.id,
      studyId: study1.id,
      siteId: site1.id,
      title: "Tremor segment",
      startTimeS: 25,
      endTimeS: 45,
    },
  });

  const clip2 = await prisma.videoClip.create({
    data: {
      id: "a6666666-6666-4666-a666-777777777777",
      sourceVideoId: video1.id,
      createdByUserId: bob.id,
      studyId: study1.id,
      siteId: site1.id,
      title: "Recovery segment",
      startTimeS: 80,
      endTimeS: 110,
    },
  });

  console.log("✅ VideoClips created");

  // ──────────────────────────────────────────────
  // 15. StitchedSequences
  // ──────────────────────────────────────────────
  const sequence1 = await prisma.stitchedSequence.create({
    data: {
      id: "a8888888-8888-4888-a888-888888888888",
      studyId: study1.id,
      siteId: site1.id,
      videoId: video1.id,
      createdByUserId: bob.id,
      title: "Tremor progression compilation",
    },
  });

  console.log("✅ StitchedSequences created");

  // ──────────────────────────────────────────────
  // 16. SequenceItems
  // ──────────────────────────────────────────────
  await prisma.sequenceItem.createMany({
    data: [
      { clipId: clip1.id, sequenceId: sequence1.id, playOrder: 1 },
      { clipId: clip2.id, sequenceId: sequence1.id, playOrder: 2 },
    ],
  });

  console.log("✅ SequenceItems created");

  // ──────────────────────────────────────────────
  // 17. AuditLogs
  // ──────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: alice.id,
        actionType: "CREATE",
        entityType: "VIDEO",
        entityId: video1.id,
        siteId: site1.id,
        oldValues: {},
        newValues: { s3Key: "uploads/study1/patient44/video1.mp4", status: "UPLOADED" },
        ipAddress: "192.168.1.10",
      },
      {
        actorUserId: jeremy.id,
        actionType: "CREATE",
        entityType: "VIDEO",
        entityId: video3.id,
        siteId: site1.id,
        oldValues: {},
        newValues: { s3Key: "uploads/study1/patient45/video3.mp4", status: "UPLOADED" },
        ipAddress: "192.168.1.10",
      },
      {
        actorUserId: bob.id,
        actionType: "CREATE",
        entityType: "ANNOTATION",
        entityId: annotation1.id,
        siteId: site1.id,
        oldValues: {},
        newValues: { type: "text_comment", text: "Notable tremor at this timestamp" },
        ipAddress: "192.168.1.20",
      },
      {
        actorUserId: bob.id,
        actionType: "READ",
        entityType: "VIDEO",
        entityId: video1.id,
        siteId: site1.id,
        oldValues: {},
        newValues: {},
        ipAddress: "192.168.1.20",
      },
    ],
  });

  console.log("✅ AuditLogs created");

  // ──────────────────────────────────────────────
  // 18. Invitation
  // ──────────────────────────────────────────────
  await prisma.invitation.create({
    data: {
      email: "newdoctor@example.com",
      role: "CLINICAL_REVIEWER",
      tokenHash: "fakehash_abc123def456",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      createdBy: dan.id,
      siteId: site1.id,
    },
  });

  console.log("✅ Invitations created");

  // ──────────────────────────────────────────────
  console.log("\n🎉 Seeding complete! Summary:");
  console.log("   Sites:          2");
  console.log("   Studies:        2");
  console.log("   Users:          4 (caregiver, reviewer, coordinator, sysadmin)");
  console.log("   Videos:         2");
  console.log("   Annotations:    3 (text, drawing_box, tag)");
  console.log("   VideoClips:     2");
  console.log("   Sequences:      1 (with 2 items)");
  console.log("   AuditLogs:      3");
  console.log("   Invitation:     1");
  console.log("\n📋 Test session tokens for Postman:");
  console.log('   Alice (CAREGIVER):         "tok_alice_test_session_001"');
  console.log('   Bob   (CLINICAL_REVIEWER):  "tok_bob_test_session_001"');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
}
