import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type {
  CreateSequenceInput,
  AddClipToSequenceInput,
  ReorderSequenceInput,
} from "./sequences.types.js";

// ────────────────────────────────────────────────────────────
// SEQUENCES
// ────────────────────────────────────────────────────────────

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
export async function createSequence(input: CreateSequenceInput, createdByUserId: string) {
  const video = await prisma.video.findUnique({
    where: { id: input.videoId },
  });

  if (!video) {
    throw AppError.notFound("Source video not found");
  }

  const sequence = await prisma.stitchedSequence.create({
    data: {
      studyId: input.studyId,
      siteId: input.siteId,
      videoId: input.videoId,
      createdByUserId,
      title: input.title,
    },
  });

  return sequence;
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
export async function addClipToSequence(sequenceId: string, input: AddClipToSequenceInput) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  const clip = await prisma.videoClip.findUnique({
    where: { id: input.clipId },
  });

  if (!clip) {
    throw AppError.notFound("Clip not found");
  }

  // Check if clip is already in this sequence
  const existing = await prisma.sequenceItem.findUnique({
    where: {
      clipId_sequenceId: {
        clipId: input.clipId,
        sequenceId,
      },
    },
  });

  if (existing) {
    throw AppError.conflict("Clip is already in this sequence");
  }

  const item = await prisma.sequenceItem.create({
    data: {
      clipId: input.clipId,
      sequenceId,
      playOrder: input.playOrder,
    },
  });

  return item;
}

/**
 * Reorders clips within a sequence by replacing all play order values.
 * Uses a transaction to ensure consistency — deletes existing items
 * and recreates them with the new ordering.
 *
 * @param sequenceId - uuid of the sequence to reorder
 * @param input - { items: [{ clipId, playOrder }] } defining the new order
 *
 * @returns the updated sequence with its reordered items
 *
 * @throws {AppError} 404 if the sequence does not exist
 */
export async function reorderSequenceClips(sequenceId: string, input: ReorderSequenceInput) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  await prisma.$transaction(async (tx) => {
    // Delete all existing items for this sequence
    await tx.sequenceItem.deleteMany({
      where: { sequenceId },
    });

    // Recreate with new play order values
    await tx.sequenceItem.createMany({
      data: input.items.map((item) => ({
        clipId: item.clipId,
        sequenceId,
        playOrder: item.playOrder,
      })),
    });
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
export async function removeClipFromSequence(sequenceId: string, clipId: string) {
  const item = await prisma.sequenceItem.findUnique({
    where: {
      clipId_sequenceId: {
        clipId,
        sequenceId,
      },
    },
  });

  if (!item) {
    throw AppError.notFound("Clip is not in this sequence");
  }

  await prisma.sequenceItem.delete({
    where: {
      clipId_sequenceId: {
        clipId,
        sequenceId,
      },
    },
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
export async function deleteSequence(sequenceId: string) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  await prisma.stitchedSequence.delete({
    where: { id: sequenceId },
  });
}