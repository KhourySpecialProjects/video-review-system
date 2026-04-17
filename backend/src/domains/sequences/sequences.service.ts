import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type {
  CreateSequenceInput,
  AddClipToSequenceInput,
  ReorderSequenceInput,
  UpdateSequenceInput,
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
 * Lists all sequences for a given video within a study, including ordered items.
 *
 * @param videoId - uuid of the source video
 * @param studyId - uuid of the study to scope sequences to
 * @returns array of sequence records with their items ordered by playOrder
 */
export async function listSequencesByVideo(videoId: string, studyId: string) {
  return prisma.stitchedSequence.findMany({
    where: { videoId, studyId },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { name: true } },
      sequenceItems: {
        orderBy: { playOrder: "asc" },
        include: { clip: true },
      },
    },
  });
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
 * Updates a sequence's title.
 *
 * @param sequenceId - uuid of the sequence to update
 * @param input - fields to update (title)
 * @returns the updated sequence with its items
 * @throws {AppError} 404 if no sequence with that id exists
 */
export async function updateSequence(sequenceId: string, input: UpdateSequenceInput) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  await prisma.stitchedSequence.update({
    where: { id: sequenceId },
    data: { title: input.title },
  });

  return getSequence(sequenceId);
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

  return prisma.sequenceItem.create({
    data: {
      clipId: input.clipId,
      sequenceId,
      playOrder: input.playOrder,
    },
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
export async function reorderSequenceClips(sequenceId: string, input: ReorderSequenceInput) {
  const sequence = await prisma.stitchedSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw AppError.notFound("Sequence not found");
  }

  // updates clips in the sequence to match the new play order
  await prisma.$transaction(input.items.map((item) =>
    prisma.sequenceItem.update({
      where: { clipId_sequenceId: { clipId: item.clipId, sequenceId } },
      data: { playOrder: item.playOrder },
    })
  ));

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