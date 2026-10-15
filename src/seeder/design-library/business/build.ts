import { PageType } from "../../../common/constants/website.js";
import type {
  FooterData,
  HeaderData,
  ImageRef,
  SectionDataMap,
  SectionSettings,
  SectionType,
  ThemeSettings,
} from "../../../modules/websites/types/site-content.types.js";
import type { TemplatePage, TemplateSection } from "../../../modules/websites/types/template.types.js";
import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";

/** Unsplash photo, cropped server-side to the requested width. */
export function photo(id: string, alt: string, width = 1600): ImageRef {
  return { url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`, alt };
}

export function section<T extends SectionType>(
  type: T,
  data: SectionDataMap[T],
  settings: Partial<SectionSettings> = {},
): TemplateSection {
  return {
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false, ...settings },
    data,
  } as TemplateSection;
}

const PAGE_TYPES: Readonly<Record<string, PageType>> = {
  "/": PageType.HOME,
  "/about": PageType.ABOUT,
  "/services": PageType.SERVICES,
  "/contact": PageType.CONTACT,
  "/blog": PageType.BLOG,
};

type PageDraft = { name: string; slug: string; sections: TemplateSection[] };

type BusinessTemplateDraft = {
  key: string;
  name: string;
  category: string;
  description: string;
  themeName: string;
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageDraft[];
};

export type BusinessTemplate = { template: WebsiteTemplateSeed; theme: ThemeSeed };

/**
 * Turns a full site design into a template seed. Every page carries the header
 * and footer as sections, because the site renderer only draws chrome a page contains.
 */
export function businessTemplate(draft: BusinessTemplateDraft): BusinessTemplate {
  const { siteName: _headerName, menu: _menu, ...header } = draft.header;
  const { siteName: _footerName, contact: _contact, copyright: _copyright, ...footer } = draft.footer;
  const pages: TemplatePage[] = draft.pages.map((page) => ({
    name: page.name,
    slug: page.slug,
    pageType: PAGE_TYPES[page.slug] ?? PageType.CUSTOM,
    showInNav: true,
    sections: [section("header", draft.header), ...page.sections, section("footer", draft.footer)],
  }));

  return {
    template: {
      key: draft.key,
      name: draft.name,
      category: draft.category,
      description: draft.description,
      themeName: draft.themeName,
      header,
      footer,
      pages,
    },
    theme: { name: draft.themeName, settings: draft.theme },
  };
}
