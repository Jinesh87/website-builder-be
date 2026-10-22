import type { PageType } from "../../../common/constants/website.js";
import type { FooterData, HeaderData, SectionDataMap, SectionSettings, SectionType } from "./site-content.types.js";

/** Section without an id; ids are generated per website when the template is used. */
export type TemplateSection = {
  [T in SectionType]: { type: T; hidden: boolean; settings: SectionSettings; data: SectionDataMap[T] };
}[SectionType];

export type TemplatePage = {
  name: string;
  slug: string;
  pageType: PageType;
  showInNav: boolean;
  /** Client templates keep hidden pages hidden; platform templates omit this (visible). */
  visible?: boolean;
  sections: TemplateSection[];
};

/** Gallery categories; Super Admin templates must use one of these. */
export const PLATFORM_TEMPLATE_CATEGORIES = [
  "Business",
  "Agency",
  "Services",
  "Health",
  "Food",
  "Portfolio",
  "Landing page",
  "Education",
] as const;
export type PlatformTemplateCategory = (typeof PLATFORM_TEMPLATE_CATEGORIES)[number];

/** Keys of templates a Super Admin published from the editor; the design-library seeder never touches them. */
export const ADMIN_TEMPLATE_KEY_PREFIX = "admin-";

/** siteName, menu, contact and copyright are filled from the website when it is created. */
export type TemplateHeader = Omit<HeaderData, "siteName" | "menu">;
export type TemplateFooter = Omit<FooterData, "siteName" | "contact" | "copyright">;
