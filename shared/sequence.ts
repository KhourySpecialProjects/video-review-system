/**
 * @description A single entry in a sequence, mapping a clip to a play order position.
 */
export type SequenceItem = {
  clipId: string;
  playOrder: number;
};

/**
 * @description An ordered collection of clips from a source video.
 */
export type Sequence = {
  id: string;
  videoId: string;
  studyId: string;
  siteId: string;
  title: string;
  createdByUserId: string;
  /** @description Display name of the user who created this sequence. */
  createdByName: string;
  createdAt: string;
  items: SequenceItem[];
};
