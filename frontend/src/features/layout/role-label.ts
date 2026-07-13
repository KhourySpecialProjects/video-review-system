/** @description Human-friendly labels for each backend role enum value. */
const ROLE_LABELS: Record<string, string> = {
    CAREGIVER: "Caregiver",
    CLINICAL_REVIEWER: "Clinical Reviewer",
    SITE_COORDINATOR: "Site Coordinator",
    SYSADMIN: "System Admin",
};

/**
 * @description Returns a display label for a user's role. Unknown or missing
 * roles fall back to "Member".
 *
 * @param role - The backend role enum value, if any.
 * @returns A human-friendly role label.
 */
export function roleLabel(role?: string): string {
    if (!role) return "Member";
    return ROLE_LABELS[role] ?? "Member";
}
