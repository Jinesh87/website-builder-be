/** BUILT_IN rows come from the seed files and can only be shown or hidden; ADMIN rows are fully editable. */
export type PlatformTemplateOrigin = "BUILT_IN" | "ADMIN";
export type PlatformTemplateStatus = "LIVE" | "HIDDEN" | "ARCHIVED";

export type AdminTemplateView = {
  id: string;
  /** Unique, URL-safe template ID used by the gallery and `templateKey` on website creation. */
  key: string;
  /** Gallery number (#3001, …) of a Super Admin template; null for built-in ones, which use their marketing number. */
  number: number | null;
  name: string;
  /** Category name, for display. */
  category: string;
  categoryId: string | null;
  description: string | null;
  origin: PlatformTemplateOrigin;
  status: PlatformTemplateStatus;
  /** Template Studio website to open with "Edit design"; null for built-in templates. */
  sourceWebsiteId: string | null;
  pages: { name: string; slug: string }[];
  /** The Template Studio design was edited after it was last saved into the template. */
  hasUnpublishedChanges: boolean;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

/** "me" limits the list to what the signed-in Super Admin created. */
export type CreatedByFilter = "me";

export type AdminTemplateListQuery = {
  status?: "live" | "hidden" | "archived";
  origin?: "built-in" | "custom";
  categoryId?: string;
  createdBy?: CreatedByFilter;
  search?: string;
};

/** A Template Studio website not yet saved as a template: work in progress, never shown to clients. */
export type TemplateDraftView = {
  websiteId: string;
  name: string;
  pageCount: number;
  createdByName: string | null;
  createdAt: string;
  /** Last edit to the draft's design. */
  updatedAt: string;
};

export type TemplateDraftListQuery = {
  createdBy?: CreatedByFilter;
  search?: string;
};

export type CreateStudioWebsiteInput =
  | { name: string; startFrom: "blank" }
  | { name: string; startFrom: "template"; templateKey: string }
  | { name: string; startFrom: "website"; websiteId: string };

export type TemplateDetailsInput = {
  name: string;
  categoryId: string;
  description?: string | null;
  isActive: boolean;
};

export type CreatePlatformTemplateInput = TemplateDetailsInput & { websiteId: string };

export type PatchPlatformTemplateInput = Partial<TemplateDetailsInput>;
