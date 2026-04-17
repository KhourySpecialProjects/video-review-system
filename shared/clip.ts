/**
 * @description A clip carved from a source video, defining a time range.
 */
export type Clip = {
  id: string;
  sourceVideoId: string;
  studyId: string;
  siteId: string;
  title: string;
  /** @description Start time in seconds within the source video. */
  startTimeS: number;
  /** @description End time in seconds within the source video. */
  endTimeS: number;
  createdByUserId: string;
  /** @description Display name of the user who created this clip. */
  createdByName: string;
  createdAt: string;
};
