import prisma from "../../lib/prisma.js";
import {
  recordAudit,
  runAuditedCreate,
  runAuditedDelete,
} from "../audit/audit.service.js";
import { buildSequenceSnapshot } from "../audit/audit.snapshots.js";
import type { AuthenticatedAuditContext } from "../audit/audit.types.js";
import { AppError } from "../../middleware/errors.js";
import type {
  CreateSequenceInput,
  AddClipToSequenceInput,
  ReorderSequenceInput,
} from "./sequences.types.js";

// ────────────────────────────────────────────────────────────
// SEQUENCES
// ────────────────────────────────────────────────────────────

type SequenceItemAuditValue = {
  clipId: string;
  playOrder: number;
};

function buildSequenceItemsSnapshot(items: SequenceItemAuditValue[]) {
  return {
    items: [...items]
      .sort((a, b) => a.playOrder - b.playOrder)
      .map((item) => ({
        clipId: item.clipId,
        playOrder: item.playOrder,
      })),
  };
}

/**
 * Creates a new stitched sequence.
 * Validates that the source video exists before creating.
 *
 * @param input - sequence fields from the validated request body
 * @param createdByUserId - the authenticated user's ID (set server-side)
 *
 * @returns the created sequence record
 *
 * @throws {AppError} 404 if the source video does not exist
 */
export async function createSequence(
  input: CreateSequenceInput,
  createdByUserId: string,
  audit?: AuthenticatedAuditContext,
) {
  const video = await prisma.video.findUnique({
    where: { id: input.videoId },
  });

  if (!video) {
    throw AppError.notFound("Source video not found");
  }

  const create = () =>
    prisma.stitchedSequence.create({
      data: {
        studyId: input.studyId,
        siteId: input.siteId,
        videoId: input.videoId,
        createdByUserId,
        title: input.title,
      },
    });

  if (!audit) {
    return create();
  }

  return prisma.$transaction((tx) =>
    runAuditedCreate({
      client: tx,
      create: () =>
        tx.stitchedSequence.create({
          data: {
            studyId: input.studyId,
            siteId: input.siteId,
            videoId: input.videoId,
            createdByUserId,
            title: input.title,
          },
        }),
      actorUserId: audit.actorUserId,
      entityType: "SEQUENCE",
      snapshot: buildSequenceSnapshot,
      getSiteId: (sequence) => sequence.siteId,
      ipAddress: audit.ipAddress,
    }),
  );
}

/**
 * Retrieves a sequence by its ID, including its ordered clips.
 *
 * @param sequenceId - uuid of the sequence
 *
 * @returns the sequence record with its items and clip details
 *
 * @throws {AppError} 404 if no sequence with that id exists
 */
export async function getSequence(sequenceId: string) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
    include: {
      sequenceItems: {
        orderBy: { playOrder: "asc" },
        include: {
          clip: true,
        },
      },
    },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  return sequence;
}

/**
 * Adds a video clip to a sequence at the specified play order position.
 * Validates that both the sequence and clip exist before adding.
 *
 * @param sequenceId - uuid of the sequence to add the clip to
 * @param input - { clipId, playOrder } from the validated request body
 *
 * @returns the created sequence item record
 *
 * @throws {AppError} 404 if the sequence does not exist
 * @throws {AppError} 404 if the clip does not exist
 * @throws {AppError} 409 if the clip is already in this sequence
 */
export async function addClipToSequence(
  sequenceId: string,
  input: AddClipToSequenceInput,
  audit?: AuthenticatedAuditContext,
) {
  const [sequence, clip, existing] = await Promise.all([
    prisma.stitchedSequence.findUnique({ where: { id: sequenceId } }),
    prisma.videoClip.findUnique({ where: { id: input.clipId } }),
    prisma.sequenceItem.findUnique({
      where: { clipId_sequenceId: { clipId: input.clipId, sequenceId } },
    }),
  ]);

  if (!sequence) throw AppError.notFound("Sequence not found");
  if (!clip) throw AppError.notFound("Clip not found");
  if (existing) throw AppError.conflict("Clip is already in this sequence");

  // ensure the clip belongs to the same video, site, and study as the sequence
  assertClipMatchesSequence(clip, sequence);

  if (!audit) {
    return prisma.sequenceItem.create({
      data: {
        clipId: input.clipId,
        sequenceId,
        playOrder: input.playOrder,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.sequenceItem.create({
      data: {
        clipId: input.clipId,
        sequenceId,
        playOrder: input.playOrder,
      },
    });

    await recordAudit(tx, {
      actorUserId: audit.actorUserId,
      actionType: "UPDATE",
      entityType: "SEQUENCE",
      entityId: sequence.id,
      siteId: sequence.siteId,
      oldValues: {},
      newValues: {
        addedClipId: item.clipId,
        playOrder: item.playOrder,
      },
      ipAddress: audit.ipAddress,
    });

    return item;
  });
}

/**
 * Reorders clips within a sequence by replacing all play order values.
 * Uses a transaction to ensure consistency
 *
 * @param sequenceId - uuid of the sequence to reorder
 * @param input - { items: [{ clipId, playOrder }] } defining the new order
 *
 * @returns the updated sequence with its reordered items
 *
 * @throws {AppError} 404 if the sequence does not exist
 */
export async function reorderSequenceClips(
  sequenceId: string,
  input: ReorderSequenceInput,
  audit?: AuthenticatedAuditContext,
) {
  await prisma.$transaction(async (tx) => {
    const sequence = await tx.stitchedSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw AppError.notFound("Sequence not found");
    }

    const beforeItems = audit
      ? await tx.sequenceItem.findMany({
          where: { sequenceId },
          select: {
            clipId: true,
            playOrder: true,
          },
        })
      : [];

    await Promise.all(
      input.items.map((item) =>
        tx.sequenceItem.update({
          where: { clipId_sequenceId: { clipId: item.clipId, sequenceId } },
          data: { playOrder: item.playOrder },
        }),
      ),
    );

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "UPDATE",
        entityType: "SEQUENCE",
        entityId: sequence.id,
        siteId: sequence.siteId,
        oldValues: buildSequenceItemsSnapshot(beforeItems),
        newValues: buildSequenceItemsSnapshot(input.items),
        ipAddress: audit.ipAddress,
      });
    }
  });

  // Return the updated sequence with ordered items
  return await getSequence(sequenceId);
}

/**
 * Removes a specific clip from a sequence without deleting the clip itself.
 *
 * @param sequenceId - uuid of the sequence
 * @param clipId - uuid of the clip to remove from the sequence
 *
 * @throws {AppError} 404 if the clip is not in this sequence
 */
export async function removeClipFromSequence(
  sequenceId: string,
  clipId: string,
  audit?: AuthenticatedAuditContext,
) {
  await prisma.$transaction(async (tx) => {
    const [sequence, item] = await Promise.all([
      tx.stitchedSequence.findUnique({ where: { id: sequenceId } }),
      tx.sequenceItem.findUnique({
        where: {
          clipId_sequenceId: {
            clipId,
            sequenceId,
          },
        },
      }),
    ]);

    if (!sequence) {
      throw AppError.notFound("Sequence not found");
    }

    if (!item) {
      throw AppError.notFound("Clip is not in this sequence");
    }

    await tx.sequenceItem.delete({
      where: {
        clipId_sequenceId: {
          clipId,
          sequenceId,
        },
      },
    });

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "UPDATE",
        entityType: "SEQUENCE",
        entityId: sequence.id,
        siteId: sequence.siteId,
        oldValues: {
          removedClipId: item.clipId,
          playOrder: item.playOrder,
        },
        newValues: {},
        ipAddress: audit.ipAddress,
      });
    }
  });
}

/**
 * Permanently deletes a sequence and all its sequence items.
 * Prisma's onDelete: Cascade on SequenceItem handles item cleanup.
 *
 * @param sequenceId - uuid of the sequence to delete
 *
 * @throws {AppError} 404 if no sequence with that id exists
 */
export async function deleteSequence(
  sequenceId: string,
  audit?: AuthenticatedAuditContext,
) {
  if (!audit) {
    const sequence = await prisma.stitchedSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw AppError.notFound("Sequence not found");
    }

    await prisma.stitchedSequence.delete({
      where: { id: sequenceId },
    });
    return;
  }

  await prisma.$transaction((tx) =>
    runAuditedDelete({
      client: tx,
      loadBefore: () =>
        tx.stitchedSequence.findUnique({
          where: { id: sequenceId },
        }),
      deleteRecord: (sequence) =>
        tx.stitchedSequence.delete({
          where: { id: sequence.id },
        }),
      notFound: AppError.notFound("Sequence not found"),
      actorUserId: audit.actorUserId,
      entityType: "SEQUENCE",
      snapshot: buildSequenceSnapshot,
      getSiteId: (sequence) => sequence.siteId,
      ipAddress: audit.ipAddress,
    }),
  );
}

/**
 * Validates that a clip belongs to the same video, site, and study as the
 * target sequence. Throws 400 if there's a mismatch.
 *
 * Both stitched sequences and video clips carry studyId, siteId, and a
 * video reference (videoId on sequence, sourceVideoId on clip), so this
 * is a direct field comparison.
 *
 * @param clip     - The video clip to validate
 * @param sequence - The stitched sequence the clip is being added to
 * 
 * @throws {AppError} with 400 status if any of the three fields don't match
 */
function assertClipMatchesSequence(
  clip: { sourceVideoId: string; siteId: string; studyId: string },
  sequence: { videoId: string; siteId: string; studyId: string }
): void {
  if (clip.sourceVideoId !== sequence.videoId) {
    throw AppError.badRequest("Clip must belong to the same video as the sequence.");
  }
  if (clip.siteId !== sequence.siteId) {
    throw AppError.badRequest("Clip must belong to the same site as the sequence.");
  }
  if (clip.studyId !== sequence.studyId) {
    throw AppError.badRequest("Clip must belong to the same study as the sequence.");
  }
}
