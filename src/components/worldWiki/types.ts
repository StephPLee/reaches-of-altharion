export type WorldWikiCategory = {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
};

export type WorldWikiAttribute = {
  key: string;
  value: string;
};

export type WorldWikiPage = {
  slug: string;
  title: string;
  markdown: string;
  category: WorldWikiCategory | null;
  coverImagePath: string | null;
  attributes: WorldWikiAttribute[];
  isDraft: boolean;
  gmOnly: boolean;
  updatedAt: string;
};

export type WorldWikiImage = {
  fileName: string;
  originalName: string;
  url: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: number;
  title: string;
  description: string;
  eraLabel: string;
  sortValue: number;
  category: string | null;
  linkedWikiSlug: string | null;
  imagePath: string | null;
  isChapterMarker: boolean;
  isDraft: boolean;
  updatedAt: string;
};

export type SessionUser = {
  isStaff: boolean;
  isDm?: boolean;
};

export function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}
