/** @description A study the current user can upload to. */
export type UserStudyOption = {
    id: string;
    name: string;
};

/** @description Response shape for `GET /domain/studies/mine`. */
export type MyStudiesResponse = {
    studies: UserStudyOption[];
};
