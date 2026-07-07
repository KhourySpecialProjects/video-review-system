/** @description A study the current user can upload to. */
export type UserStudyOption = {
    id: string;
    name: string;
};

/** @description Response shape for `GET /domain/studies/mine`. */
export type MyStudiesResponse = {
    studies: UserStudyOption[];
};

/** @description A study row returned by the list studies endpoint. */
export type StudyListItem = {
    id: string;
    name: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
    createdAt: string;
    sites: { id: string; name: string }[];
};

/** @description Paginated response from GET /api/domain/studies. */
export type ListStudiesResponse = {
    studies: StudyListItem[];
    total: number;
    limit: number;
    offset: number;
};

/** @description A user eligible to be added to a study. */
export type EligibleStudyUser = {
    id: string;
    name: string;
    email: string;
    role: string;
};

/** @description Response from GET /api/domain/studies/:studyId/eligible-users. */
export type EligibleStudyUsersResponse = {
    users: EligibleStudyUser[];
};

/**
 * @description Response from GET /api/domain/studies/caregivers-for-sites.
 * Same shape as EligibleStudyUsersResponse — caregivers from the
 * specified sites.
 */
export type SiteCaregiversResponse = {
    users: EligibleStudyUser[];
};

/** @description Response from POST /api/domain/studies/:studyId/users. */
export type AddStudyUsersResponse = {
    added: number;
};
