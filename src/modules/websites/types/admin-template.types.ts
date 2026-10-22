import type { PlatformTemplateCategory } from "./template.types.js";

/** BUILT_IN rows come from the seed files and can only be shown or hidden; ADMIN rows are fully editable. */
export type PlatformTemplateOrigin = "BUILT_IN" | "ADMIN";
export type PlatformTemplateStatus = "LIVE" | "HIDDEN" | "ARCHIVED";

export type AdminTemplateView = {
  id: string;
  /** Unique, URL-safe template ID used by the gallery and `templateKey` on website creation. */
  key: string;
  name: string;
  category: string;
  description: string | null;
  origin: PlatformTemplateOrigin;
  status: PlatformTemplateStatus;
  /** Template Studio website to open with "Edit design"; null for built-in templates. */
  sourceWebsiteId: string | null;
  pages: { name: string; slug: string }[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTemplateListQuery = {
  status?: "live" | "hidden" | "archived";
  category?: string;
  search?: string;
};

export type CreateStudioWebsiteInput =
  | { name: string; startFrom: "blank" }
  | { name: string; startFrom: "template"; templateKey: string }
  | { name: string; startFrom: "website"; websiteId: string };

export type TemplateDetailsInput = {
  name: string;
  category: PlatformTemplateCategory;
  description?: string | null;
  isActive: boolean;
};

export type CreatePlatformTemplateInput = TemplateDetailsInput & { websiteId: string };

export type PatchPlatformTemplateInput = Partial<TemplateDetailsInput>;
