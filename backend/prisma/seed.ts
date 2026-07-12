/**
 * Local-dev seed.
 *
 * The original 560-line seed was removed in the vmp-156 merge. This builds a
 * small but realistic dataset so a fresh local database is immediately useful:
 * multiple sites/studies, one user per role, caregiver-uploaded videos linked
 * to studies with varied review status, and a couple of annotations/clips.
 *
 * Passwords are hashed by Better Auth itself (via auth.$context) so the normal
 * login flow accepts them. Every seeded user's password comes from the
 * SEED_PASSWORD env var, defaulting to `password123` when unset.
 *
 * The seed is destructive-but-idempotent: it wipes the domain tables and
 * recreates them, so `npx prisma db seed` can be re-run at any time. It refuses
 * to run when NODE_ENV=production.
 *
 * When LOCAL=true it also best-effort uploads a small public sample video to
 * each video's s3Key (see uploadSampleVideoBytes) so streaming works locally.
 * That step never fails the seed — the DB rows are seeded regardless.
 *
 * Run with: `npx prisma db seed` (or `tsx prisma/seed.ts`).
 */
import { randomUUID } from "crypto";
import prisma from "../src/lib/prisma.js";
import { auth, seedDefaultPermission } from "../src/lib/auth.js";
import { putObject } from "../src/lib/s3.js";
import { thumbnailKeyFor } from "../src/lib/mediaKeys.js";
import type { user_role, review_status } from "../src/generated/prisma/index.js";

// Overridable so a publicly-reachable deploy isn't seeded with a known
// credential. Defaults to the local-dev password.
const PASSWORD = process.env.SEED_PASSWORD || "password123";

/**
 * Public sample video used to make seeded videos actually playable in local
 * dev. From test-videos.co.uk (Big Buck Bunny, ~1 MB, 10s, H.264 MP4).
 * Override with SEED_SAMPLE_VIDEO_URL. Not committed — fetched at seed time.
 */
const DEFAULT_SAMPLE_VIDEO_URL =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";

/**
 * Best-effort: make seeded videos playable locally by uploading media to the
 * S3 keys the app actually streams from. For each base key the app reads
 * `<key>.mp4` (video) and `<key>.jpg` (thumbnail), so we write both. Downloads
 * the video once and reuses it; thumbnails are per-video for variety.
 *
 * Only runs when LOCAL=true, and never fails the seed — if offline, a URL is
 * down, or S3 isn't reachable, it logs a warning and the DB rows still stand.
 */
async function uploadSampleMedia(videoKeys: string[]): Promise<void> {
  if (process.env.LOCAL !== "true") return;

  const url = process.env.SEED_SAMPLE_VIDEO_URL || DEFAULT_SAMPLE_VIDEO_URL;
  try {
    console.log(`Fetching sample video: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const videoBytes = Buffer.from(await res.arrayBuffer());

    for (const key of videoKeys) {
      await putObject(key, videoBytes, "video/mp4");
    }
    const mb = (videoBytes.length / 1024 / 1024).toFixed(1);
    console.log(`Uploaded sample video (${mb} MB) to ${videoKeys.length} keys.`);
  } catch (err) {
    console.warn(
      `[seed] Skipped sample-video upload (${(err as Error).message}). ` +
        `DB rows are still seeded; start LocalStack and re-run to enable streaming.`
    );
    return; // if the video upload failed, thumbnails would fail the same way
  }

  // Thumbnails (best-effort, per video). A miss just means a broken poster.
  try {
    let uploaded = 0;
    for (let i = 0; i < videoKeys.length; i++) {
      const thumbRes = await fetch(`https://picsum.photos/seed/asclepion${i}/640/360`);
      if (!thumbRes.ok) continue;
      await putObject(thumbnailKeyFor(videoKeys[i]), Buffer.from(await thumbRes.arrayBuffer()), "image/jpeg");
      uploaded++;
    }
    console.log(`Uploaded ${uploaded} sample thumbnails.`);
  } catch (err) {
    console.warn(`[seed] Skipped thumbnails (${(err as Error).message}).`);
  }
}

/** Fixed clock so seeded timestamps are deterministic across runs. */
const NOW = new Date("2026-07-01T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

/**
 * Creates a Better-Auth credential user (user row + credential account row).
 * Mirrors what signup/invite acceptance would produce.
 */
async function createUser(opts: {
  name: string;
  email: string;
  role: user_role;
  siteId: string;
  passwordHash: string;
}): Promise<string> {
  const userId = randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      role: opts.role,
      siteId: opts.siteId,
      updatedAt: NOW,
    },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: opts.passwordHash,
      updatedAt: NOW,
    },
  });
  return userId;
}

/** Wipe managed domain tables, children first so FKs are satisfied. */
async function wipe(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.sequenceItem.deleteMany();
  await prisma.stitchedSequence.deleteMany();
  await prisma.videoClip.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.videoStudy.deleteMany();
  await prisma.caregiverVideoMetadata.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.caregiverPatient.deleteMany();
  await prisma.video.deleteMany();
  await prisma.siteStudy.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.study.deleteMany();
  await prisma.site.deleteMany();
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the seed with NODE_ENV=production.");
  }

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(PASSWORD);

  await wipe();

  // ── Sites ──────────────────────────────────────────────────────────────
  const boston = await prisma.site.create({
    data: { name: "Boston Children's Hospital" },
  });
  const seattle = await prisma.site.create({
    data: { name: "Seattle Children's Hospital" },
  });

  // ── Studies ────────────────────────────────────────────────────────────
  const seizure = await prisma.study.create({
    data: { name: "Seizure Characterization 2026", status: "IN_PROGRESS" },
  });
  const nocturnal = await prisma.study.create({
    data: { name: "Nocturnal Movement Study", status: "IN_PROGRESS" },
  });
  const baseline = await prisma.study.create({
    data: { name: "Baseline Motor Assessment", status: "NOT_STARTED" },
  });

  // Which studies run at which sites.
  await prisma.siteStudy.createMany({
    data: [
      { studyId: seizure.id, siteId: boston.id },
      { studyId: seizure.id, siteId: seattle.id },
      { studyId: nocturnal.id, siteId: boston.id },
      { studyId: baseline.id, siteId: seattle.id },
    ],
  });

  // ── Users (one per role; all password123) ────────────────────────────────
  const adminId = await createUser({
    name: "Local Admin", email: "admin@local.dev",
    role: "SYSADMIN", siteId: boston.id, passwordHash,
  });
  await seedDefaultPermission(adminId, "SYSADMIN", boston.id); // global ADMIN

  const coordinatorId = await createUser({
    name: "Casey Coordinator", email: "coordinator@local.dev",
    role: "SITE_COORDINATOR", siteId: boston.id, passwordHash,
  });
  await seedDefaultPermission(coordinatorId, "SITE_COORDINATOR", boston.id); // ADMIN over Boston

  const reviewerId = await createUser({
    name: "Robin Reviewer", email: "reviewer@local.dev",
    role: "CLINICAL_REVIEWER", siteId: boston.id, passwordHash,
  });
  // Reviewers have no default row — grant an explicit study-scoped permission.
  // This scopes their /reviews list to just the Seizure Characterization study,
  // which nicely demonstrates permission scoping (SYSADMIN sees everything).
  await prisma.userPermission.create({
    data: { userId: reviewerId, studyId: seizure.id, permissionLevel: "WRITE" },
  });

  const caregiver1Id = await createUser({
    name: "Dana Caregiver", email: "caregiver1@local.dev",
    role: "CAREGIVER", siteId: boston.id, passwordHash,
  });
  const caregiver2Id = await createUser({
    name: "Sam Caregiver", email: "caregiver2@local.dev",
    role: "CAREGIVER", siteId: seattle.id, passwordHash,
  });

  // Caregiver ↔ study membership.
  await prisma.caregiverPatient.createMany({
    data: [
      { studyId: seizure.id, userId: caregiver1Id },
      { studyId: nocturnal.id, userId: caregiver1Id },
      { studyId: seizure.id, userId: caregiver2Id },
      { studyId: baseline.id, userId: caregiver2Id },
    ],
  });

  // ── Videos ────────────────────────────────────────────────────────────────
  // Each entry: uploaded by a caregiver, linked to one study+site, with private
  // caregiver metadata and a review status. Review statuses are varied so the
  // reviews page shows all three buckets.
  const videoPlan: Array<{
    uploaderId: string;
    siteId: string;
    studyId: string;
    title: string;
    notes: string;
    durationSeconds: number;
    fileSizeMB: number;
    daysAgo: number;
    reviewStatus: review_status;
    comment?: string;
  }> = [
    {
      uploaderId: caregiver1Id, siteId: boston.id, studyId: seizure.id,
      title: "Morning episode — arm stiffening", notes: "~15s, right arm, after waking.",
      durationSeconds: 10, fileSizeMB: 22, daysAgo: 2, reviewStatus: "NOT_REVIEWED",
    },
    {
      uploaderId: caregiver1Id, siteId: boston.id, studyId: seizure.id,
      title: "Afternoon staring spell", notes: "Unresponsive for a few seconds.",
      durationSeconds: 10, fileSizeMB: 15, daysAgo: 5, reviewStatus: "IN_REVIEW",
      comment: "Possible absence seizure — reviewing.",
    },
    {
      uploaderId: caregiver1Id, siteId: boston.id, studyId: nocturnal.id,
      title: "Nighttime movement 03:14", notes: "Rhythmic leg movement during sleep.",
      durationSeconds: 10, fileSizeMB: 61, daysAgo: 9, reviewStatus: "NOT_REVIEWED",
    },
    {
      uploaderId: caregiver2Id, siteId: seattle.id, studyId: seizure.id,
      title: "Post-meal jerking", notes: "Brief myoclonic jerks after lunch.",
      durationSeconds: 10, fileSizeMB: 27, daysAgo: 3, reviewStatus: "REVIEWED",
      comment: "Confirmed myoclonic activity; annotated.",
    },
    {
      uploaderId: caregiver2Id, siteId: seattle.id, studyId: seizure.id,
      title: "Evening episode — full body", notes: "Longer event, ~40s.",
      durationSeconds: 10, fileSizeMB: 35, daysAgo: 12, reviewStatus: "IN_REVIEW",
    },
    {
      uploaderId: caregiver2Id, siteId: seattle.id, studyId: baseline.id,
      title: "Baseline calm sitting", notes: "Reference clip, no event.",
      durationSeconds: 10, fileSizeMB: 44, daysAgo: 20, reviewStatus: "NOT_REVIEWED",
    },
  ];

  const PART_SIZE_MB = 10;
  const createdVideos: { id: string; s3Key: string; studyId: string; siteId: string; reviewStatus: review_status }[] = [];

  for (const v of videoPlan) {
    const videoId = randomUUID();
    const takenAt = daysAgo(v.daysAgo);
    // s3Key is the LITERAL object key of the uploaded video, mirroring the real
    // upload flow (`uploads/<id>/<name>`). The thumbnail lives alongside it as a
    // .jpg (see thumbnailKeyFor / videos.service.ts).
    const s3Key = `uploads/${videoId}/sample.mp4`;
    await prisma.video.create({
      data: {
        id: videoId,
        uploadedByUserId: v.uploaderId,
        s3Key,
        status: "UPLOADED",
        fileSize: BigInt(v.fileSizeMB * 1024 * 1024),
        totalParts: Math.max(1, Math.ceil(v.fileSizeMB / PART_SIZE_MB)),
        durationSeconds: v.durationSeconds,
        createdAt: takenAt,
        takenAt,
      },
    });
    await prisma.caregiverVideoMetadata.create({
      data: {
        videoId,
        caregiverUserId: v.uploaderId,
        privateTitle: v.title,
        privateNotes: v.notes,
      },
    });
    await prisma.videoStudy.create({
      data: {
        studyId: v.studyId,
        siteId: v.siteId,
        videoId,
        reviewStatus: v.reviewStatus,
        commentOverview: v.comment ?? null,
      },
    });
    createdVideos.push({ id: videoId, s3Key, studyId: v.studyId, siteId: v.siteId, reviewStatus: v.reviewStatus });
  }

  // ── Annotations + a clip on the REVIEWED video (authored by the reviewer) ──
  const reviewed = createdVideos.find((v) => v.reviewStatus === "REVIEWED")!;
  await prisma.annotation.createMany({
    data: [
      {
        videoId: reviewed.id, authorUserId: reviewerId,
        studyId: reviewed.studyId, siteId: reviewed.siteId,
        type: "text_comment", timestampS: 3, durationS: 0,
        payload: { text: "Onset of myoclonic jerk" }, createdAt: daysAgo(1),
      },
      {
        videoId: reviewed.id, authorUserId: reviewerId,
        studyId: reviewed.studyId, siteId: reviewed.siteId,
        type: "tag", timestampS: 6, durationS: 2,
        payload: { label: "myoclonic" }, createdAt: daysAgo(1),
      },
    ],
  });
  await prisma.videoClip.create({
    data: {
      videoId: reviewed.id, createdByUserId: reviewerId,
      studyId: reviewed.studyId, siteId: reviewed.siteId,
      title: "Jerk sequence", startTimeS: 2, endTimeS: 8, createdAt: daysAgo(1),
    },
  });

  // ── Sample media (best-effort, LOCAL only) ─────────────────────────────────
  await uploadSampleMedia(createdVideos.map((v) => v.s3Key));

  // ── Summary ────────────────────────────────────────────────────────────────
  const line = "─".repeat(60);
  console.log(line);
  console.log('Seed complete. Logins (password = $SEED_PASSWORD, or "password123" if unset):');
  console.log("  admin@local.dev         SYSADMIN          (sees everything)");
  console.log("  coordinator@local.dev   SITE_COORDINATOR  (Boston site admin)");
  console.log("  reviewer@local.dev      CLINICAL_REVIEWER (Seizure study only)");
  console.log("  caregiver1@local.dev    CAREGIVER         (Boston)");
  console.log("  caregiver2@local.dev    CAREGIVER         (Seattle)");
  console.log(line);
  console.log(`Sites: 2   Studies: 3   Videos: ${createdVideos.length}`);
  console.log(line);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
