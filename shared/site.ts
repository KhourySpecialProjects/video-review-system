/** @description A site row returned by the list sites endpoint. */
export type SiteListItem = {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  studyCount: number;
  coordinatorName: string | null;
};

/** @description Paginated response from GET /api/domain/sites. */
export type ListSitesResponse = {
  sites: SiteListItem[];
  total: number;
  limit: number;
  offset: number;
};

/** @description Detailed site response from GET /api/domain/sites/:siteId. */
export type SiteDetailResponse = {
  id: string;
  name: string;
  createdAt: string;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    isDeactivated: boolean;
  }[];
  studies: { id: string; name: string; status: string }[];
};

/** @description A minimal site option used in Select dropdowns. */
export type SiteOption = {
  id: string;
  name: string;
};

/** @description Response from GET /api/domain/sites/options. */
export type SiteOptionsResponse = {
  sites: SiteOption[];
};
