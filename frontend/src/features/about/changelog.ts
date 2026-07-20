/**
 * @description End-user-facing changelog for the Asclepion portal. Entries are
 * curated for caregivers, site coordinators, clinical reviewers, and admins —
 * plain-language highlights of what changed, not developer or ticket detail.
 * Newest entry first. Rendered by {@link ChangelogPage}.
 */
export type ChangelogEntry = {
    /** Release/update date, ISO `YYYY-MM-DD` (formatted for display in UTC). */
    date: string;
    /** App version this update corresponds to, when tagged. */
    version?: string;
    /** Plain-language, end-user-facing highlights for this update. */
    highlights: string[];
};

/** @description Portal changelog, newest first. */
export const changelog: ChangelogEntry[] = [
    {
        date: "2026-07-20",
        version: "0.1.0",
        highlights: [
            "New welcome page and a cleaner, brighter look with light mode on by default.",
            "Added this About page and a What's-new changelog so you can follow how the portal is improving.",
            "Admins and site coordinators can now copy a shareable invite link to add teammates and testers directly.",
            "Admin tables and forms now show clear names and labels instead of raw IDs and codes.",
        ],
    },
    {
        date: "2026-07-13",
        highlights: [
            "Videos now play back reliably right after uploading, and video cards show a thumbnail preview.",
            'Smoother video uploads from iPhone, with a "Preparing video" indicator while your video gets ready.',
            "Reviewers and coordinators can move videos through review stages: Not reviewed, In review, and Reviewed.",
            "Reviewers get a filterable list of the videos assigned to them, with reliable page navigation.",
            "New account menu in the top-right shows your name and role, with quick links and the current app version.",
        ],
    },
];
