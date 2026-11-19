/** Mirrors frontend/src/site-kit/showcase-types.ts. Stored in site data, so values are only ever appended. */

import type { GridColumns, ImageRef, LinkRef } from "./site-content.types.js";

export const SHOWCASE_MODES = ["products", "tabs", "grouped", "categories"] as const;
export const SHOWCASE_PRODUCT_DESIGNS = ["classic", "minimal", "overlay", "horizontal", "spotlight", "catalogue"] as const;
export const SHOWCASE_CATEGORY_DESIGNS = ["tiles", "cards", "circles", "pills"] as const;
export const SHOWCASE_IMAGE_ASPECTS = ["1:1", "4:3", "3:4", "16:9"] as const;
export const SHOWCASE_MAX_PRODUCTS = 200;
export const SHOWCASE_MAX_CATEGORIES = 40;
export const SHOWCASE_SUMMARY_LINES_MAX = 6;

export type ShowcaseCategory = {
  id: string;
  name: string;
  description?: string;
  image?: ImageRef;
  link?: LinkRef;
};

export type ShowcaseProduct = {
  id: string;
  name: string;
  summary?: string;
  price?: string;
  image?: ImageRef;
  badge?: string;
  categoryId?: string;
  link?: LinkRef;
};

/** Display-only product / category catalogue; no cart or checkout. */
export type ShowcaseData = {
  mode: (typeof SHOWCASE_MODES)[number];
  design?: (typeof SHOWCASE_PRODUCT_DESIGNS)[number];
  categoryDesign?: (typeof SHOWCASE_CATEGORY_DESIGNS)[number];
  eyebrow?: string;
  heading: string;
  intro?: string;
  headerAlign?: "center" | "left";
  categoryId?: string;
  allLabel?: string;
  otherLabel?: string;
  columns: GridColumns;
  tabletColumns?: GridColumns;
  mobileColumns: GridColumns;
  imageAspect?: (typeof SHOWCASE_IMAGE_ASPECTS)[number];
  imageFit?: "cover" | "contain";
  showImage?: boolean;
  showName?: boolean;
  showSummary?: boolean;
  showPrice?: boolean;
  showCategory?: boolean;
  showBadge?: boolean;
  showButton?: boolean;
  showCount?: boolean;
  showCategoryDescription?: boolean;
  summaryLines?: number;
  defaultLink?: LinkRef;
  emptyMessage?: string;
  categories: ShowcaseCategory[];
  products: ShowcaseProduct[];
};
