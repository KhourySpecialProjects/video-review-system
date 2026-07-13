import { describe, it, expect } from "vitest";
import { roleLabel } from "./role-label";

describe("roleLabel", () => {
    it("maps known roles to friendly labels", () => {
        expect(roleLabel("CAREGIVER")).toBe("Caregiver");
        expect(roleLabel("CLINICAL_REVIEWER")).toBe("Clinical Reviewer");
        expect(roleLabel("SITE_COORDINATOR")).toBe("Site Coordinator");
        expect(roleLabel("SYSADMIN")).toBe("System Admin");
    });

    it("falls back to Member for a missing role", () => {
        expect(roleLabel(undefined)).toBe("Member");
    });

    it("falls back to Member for an unknown role", () => {
        expect(roleLabel("MARKETING_INTERN")).toBe("Member");
    });
});
