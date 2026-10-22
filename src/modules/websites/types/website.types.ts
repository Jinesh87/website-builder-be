import type { BuilderType, PageType, WebsiteStatus } from "../../../common/constants/website.js";
import type { GenerationStatus } from "../../../generated/prisma/enums.js";
import type { FooterData, HeaderData, Section, ThemeSettings } from "./site-content.types.js";
import type { GenerationView } from "./website-generation.types.js";

export type WebsiteSummary = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  builderType: BuilderType;
  status: WebsiteStatus;
  subdomain: string;
  pageCount: number;
  /** Set while (or after) an AI build of this website's draft ran. */
  generationStatus: GenerationStatus | null;
  hasUnpublishedChanges: boolean;
  /** Shows SEO fields and the pre-publish SEO audit in the editor. */
  seoToolsEnabled: boolean;
  /** Super Admin has allowed this company to use a shop. */
  shopFeatureEnabled: boolean;
  /** Client has turned the shop on for this website. */
  shopEnabled: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteInfo = {
  businessName: string | null;
  websiteType: string | null;
  industry: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

export type PageView = {
  id: string;
  name: string;
  slug: string;
  pageType: PageType;
  visible: boolean;
  showInNav: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  templateKey?: string | null;
  sections: Section[];
};

export type WebsiteDraft = {
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageView[];
  /** Send back as `expectedDraftUpdatedAt` when saving, to detect concurrent edits. */
  draftUpdatedAt: string;
};

export type WebsiteDetail = WebsiteSummary & {
  /** Primary active custom domain; the live site canonicalises to it when set. */
  customDomain: string | null;
  info: WebsiteInfo;
  draft: WebsiteDraft;
  generation: GenerationView | null;
};

export type WebsiteListQuery = {
  search?: string;
  clientId?: string;
  status?: WebsiteStatus;
  builderType?: BuilderType;
  page: number;
  pageSize: number;
};

export type WebsiteListResult = {
  items: WebsiteSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type WebsiteInfoInput = {
  [K in keyof WebsiteInfo]?: string | null;
};

export type CreateWebsiteInput = WebsiteInfoInput & {
  /** Required for Super Admin; ignored for clients (their own workspace is used). */
  clientId?: string;
  name: string;
  /** Omitted = start blank (one empty home page). */
  templateKey?: string;
  /** Overrides the template's theme. */
  themeId?: string;
  subdomain?: string;
};

export type UpdateWebsiteInput = WebsiteInfoInput & {
  name?: string;
  seoToolsEnabled?: boolean;
  shopEnabled?: boolean;
};

export type PageInput = {
  /** Page id; omitted ids get a new UUID, new client-generated UUIDs are kept. */
  id?: string;
  name: string;
  slug: string;
  pageType: PageType;
  visible: boolean;
  showInNav: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  sections: Section[];
};

export type SaveDraftInput = {
  expectedDraftUpdatedAt: string;
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageInput[];
};

export type SavePageContentInput = {
  expectedDraftUpdatedAt: string;
  schemaVersion: number;
  sections: Section[];
};

export type PublishInput = { expectedDraftUpdatedAt: string };

/** Immutable content of a published version: everything visitors see, nothing editor-only. */
export type PublishSnapshot = {
  schemaVersion: number;
  site?: { language?: string };
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: (Pick<PageView, "id" | "name" | "slug" | "pageType" | "showInNav" | "seoTitle" | "seoDescription" | "sections"> & {
    /** ISO time this page's content last changed in a publish; absent in older snapshots. */
    lastModified?: string;
    /** Absent in older snapshots. */
    seoKeywords?: string[];
  })[];
};

export type WebsiteVersionView = {
  id: string;
  version: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  isLive: boolean;
  publishedByName: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type TemplateListQuery = {
  /** Super Admin only: include this client's own templates. */
  clientId?: string;
};

export type SaveTemplateInput = { name: string; description?: string | null };

export type UpdateTemplateInput = { name?: string; description?: string | null };

export type SavedSectionView = {
  id: string;
  name: string;
  sectionType: Section["type"];
  section: Section;
  /** Shared by the platform (read-only for clients). */
  isPlatform: boolean;
  createdAt: string;
};

export type SaveSectionInput = { name: string; section: Section };

export type ThemeSummary = { id: string; name: string; settings: ThemeSettings };

export type WebsiteTemplateSummary = {
  id: string;
  key: string;
  /** True for a client's own saved template; false for platform templates. */
  isCustom: boolean;
  name: string;
  category: string;
  description: string | null;
  thumbnailUrl: string | null;
  themeId: string | null;
  pages: { name: string; slug: string }[];
};

/** Read-only render of a platform template, shaped like a website draft so the site-kit can draw it. */
export type TemplatePreview = {
  template: WebsiteTemplateSummary;
  site: {
    theme: ThemeSettings;
    header: HeaderData;
    footer: FooterData;
    pages: { id: string; name: string; slug: string; sections: Section[] }[];
  };
};
