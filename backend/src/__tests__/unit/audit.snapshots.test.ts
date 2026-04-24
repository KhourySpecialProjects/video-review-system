import { describe, expect, it } from "vitest";
import {
  buildAnnotationSnapshot,
  buildAnnotationUpdateSnapshot,
  buildClipSnapshot,
  buildPermissionSnapshot,
  buildSequenceSnapshot,
  buildUserSnapshot,
  buildVideoSnapshot,
  summarizeAnnotationPayload,
} from "../../domains/audit/audit.snapshots.js";

describe("audit.snapshots", () => {
  it("buildUserSnapshot returns only the allow-listed fields", () => {
    const user = {
      id: "user-1",
      name: "Ignored Name",
      email: "user@example.com",
      role: "CAREGIVER" as const,
      siteId: "11111111-1111-1111-8111-111111111111",
      isDeactivated: false,
    };

    expect(buildUserSnapshot(user)).toEqual({
      id: "user-1",
      email: "user@example.com",
      role: "CAREGIVER",
      siteId: "11111111-1111-1111-8111-111111111111",
      isDeactivated: false,
    });
  });

  it("buildVideoSnapshot includes metadata only when explicitly provided", () => {
    const baseVideo = {
      id: "video-1",
      uploadedByUserId: "user-1",
      status: "UPLOADED" as const,
      durationSeconds: 42,
      takenAt: new Date("2026-04-20T15:30:00.000Z"),
    };

    expect(buildVideoSnapshot(baseVideo)).toEqual({
      uploadedByUserId: "user-1",
      status: "UPLOADED",
      durationSeconds: 42,
      takenAt: "2026-04-20T15:30:00.000Z",
    });

    expect(
      buildVideoSnapshot(baseVideo, {
        privateTitle: "Morning episode",
        privateNotes: "Occurred after waking up",
      }),
    ).toEqual({
      uploadedByUserId: "user-1",
      status: "UPLOADED",
      durationSeconds: 42,
      takenAt: "2026-04-20T15:30:00.000Z",
      privateTitle: "Morning episode",
      privateNotes: "Occurred after waking up",
    });
  });

  it("summarizeAnnotationPayload keeps only small safe payload fields", () => {
    expect(
      summarizeAnnotationPayload("text_comment", {
        text: "Patient smiled here",
        secret: "do-not-log",
      }),
    ).toEqual({
      text: "Patient smiled here",
    });

    expect(
      summarizeAnnotationPayload("freehand_drawing", {
        points: [
          [0, 0],
          [10, 5],
          [20, 15],
        ],
        color: "#ff0000",
        rawSvg: "<svg />",
      }),
    ).toEqual({
      changed: true,
    });
  });

  it("buildAnnotationSnapshot summarizes payload content", () => {
    const annotation = {
      id: "annotation-1",
      videoId: "video-1",
      authorUserId: "user-1",
      studyId: "study-1",
      siteId: "site-1",
      type: "drawing_box" as const,
      timestampS: 34,
      durationS: 5,
      payload: {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        debug: "ignored",
      },
    };

    expect(buildAnnotationSnapshot(annotation)).toEqual({
      videoId: "video-1",
      studyId: "study-1",
      siteId: "site-1",
      type: "drawing_box",
      timestampS: 34,
      durationS: 5,
      payload: {
        changed: true,
      },
    });

    expect(buildAnnotationUpdateSnapshot(annotation)).toEqual({
      timestampS: 34,
      durationS: 5,
      payload: {
        changed: true,
      },
    });
  });

  it("buildPermissionSnapshot keeps the stored permission scope only", () => {
    const permission = {
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "ADMIN" as const,
      siteId: "site-1",
      studyId: null,
      videoId: null,
      expandedScope: "ignored",
    };

    expect(buildPermissionSnapshot(permission)).toEqual({
      userId: "user-1",
      permissionLevel: "ADMIN",
      siteId: "site-1",
      studyId: null,
      videoId: null,
    });
  });

  it("buildClipSnapshot and buildSequenceSnapshot keep only stable fields", () => {
    expect(
      buildClipSnapshot({
        sourceVideoId: "video-1",
        studyId: "study-1",
        siteId: "site-1",
        title: "Interesting section",
        startTimeS: 5,
        endTimeS: 12,
      }),
    ).toEqual({
      sourceVideoId: "video-1",
      studyId: "study-1",
      siteId: "site-1",
      title: "Interesting section",
      startTimeS: 5,
      endTimeS: 12,
    });

    expect(
      buildSequenceSnapshot({
        videoId: "video-1",
        studyId: "study-1",
        siteId: "site-1",
        title: "Episode highlights",
      }),
    ).toEqual({
      videoId: "video-1",
      studyId: "study-1",
      siteId: "site-1",
      title: "Episode highlights",
    });
  });
});
