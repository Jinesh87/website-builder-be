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

/**
 * Categories the built-in templates use, in gallery order. Seeded as locked `template_categories` rows;
 * the 20261023120000_template_categories migration inserts the same slugs and names.
 */
export const SYSTEM_TEMPLATE_CATEGORIES = [
  { slug: "business", name: "Business" },
  { slug: "agency", name: "Agency" },
  { slug: "services", name: "Services" },
  { slug: "health", name: "Health" },
  { slug: "food", name: "Food" },
  { slug: "portfolio", name: "Portfolio" },
  { slug: "landing-page", name: "Landing page" },
  { slug: "education", name: "Education" },
] as const;

/** Keys of templates a Super Admin published from the editor; the design-library seeder never touches them. */
export const ADMIN_TEMPLATE_KEY_PREFIX = "admin-";

/** siteName, menu, contact and copyright are filled from the website when it is created. */
export type TemplateHeader = Omit<HeaderData, "siteName" | "menu">;
export type TemplateFooter = Omit<FooterData, "siteName" | "contact" | "copyright">;
