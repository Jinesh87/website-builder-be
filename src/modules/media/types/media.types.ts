import type { MediaKind } from "../../../common/constants/media.js";

export type MediaFileView = {
  id: string;
  clientId: string;
  clientName: string;
  websiteId: string | null;
  folderId: string | null;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  /** Stable public URL; this is what website content stores. */
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaFolderView = {
  id: string;
  clientId: string;
  name: string;
  fileCount: number;
  createdAt: Date;
};

export type MediaUsageKind = "PAGE" | "HEADER" | "FOOTER" | "LOGO" | "LIVE_SITE" | "TEMPLATE" | "SAVED_SECTION";

/** One place that still references a file. `label` is the page, template or saved section name. */
export type MediaUsage = {
  kind: MediaUsageKind;
  websiteId: string | null;
  websiteName: string | null;
  label: string | null;
};

export type StorageUsage = { usedBytes: number; limitBytes: number };

export type MediaListQuery = {
  clientId?: string;
  websiteId?: string;
  /** A folder id, or "none" for files outside any folder. */
  folderId?: string;
  kind?: MediaKind;
  search?: string;
  page: number;
  pageSize: number;
};

export type MediaListResult = {
  files: MediaFileView[];
  total: number;
  page: number;
  pageSize: number;
  /** Only when the list is limited to one client. */
  usage: StorageUsage | null;
};

export type UploadMediaInput = {
  clientId?: string;
  websiteId?: string;
  folderId?: string;
  altText?: string;
};

export type GenerateVariationsInput = {
  clientId?: string;
  websiteId?: string;
  count: number;
  instructions?: string;
};

/** A generated image that has not been saved; `data` is base64. */
export type ImageSample = {
  mimeType: string;
  data: string;
};

export type UploadedFile = {
  buffer: Buffer;
  originalName: string;
  size: number;
};

export type UpdateMediaInput = {
  fileName?: string;
  altText?: string | null;
  folderId?: string | null;
};

export type FolderListQuery = { clientId?: string };
export type CreateFolderInput = { name: string; clientId?: string };
export type UpdateFolderInput = { name: string };
