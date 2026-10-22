import type { FooterData, HeaderData, SectionSettings } from "../types/site-content.types.js";

type ChromeSection = { id?: string; type: string; hidden: boolean; settings: SectionSettings; data: unknown };
type ChromePage = { slug: string; pageType?: string; sections: readonly ChromeSection[] };

/** Ids of a page's own header/footer, which replace the site-wide one on that page (hidden = none). */
const PAGE_CHROME_IDS: Readonly<Record<string, string>> = { header: "page-header", footer: "page-footer" };

export function isChromeSection(section: { type: string }): boolean {
  return section.type === "header" || section.type === "footer";
}

/** A header/footer copied onto a page before they became site-wide; a page's own one is not a copy. */
function isChromeCopy(section: { id?: string; type: string }): boolean {
  return isChromeSection(section) && section.id !== PAGE_CHROME_IDS[section.type];
}

/** Site header/footer data taken from a page's own header/footer section, with its style and visibility. */
function fromSection<T extends HeaderData | FooterData>(base: T, section: ChromeSection): T {
  const { settings: _settings, hidden: _hidden, ...data } = (section.data ?? {}) as T;
  const next = { ...base, ...data, settings: section.settings } as T;
  if (section.hidden) next.hidden = true;
  else delete next.hidden;
  return next;
}

/**
 * Every page shows the one site-wide header and footer. Sites built before that kept a copy on each
 * page, so the home page's copy (or the first one found) becomes the site header/footer and the copies
 * are removed from the pages. A page's own header/footer stays on its page. Content without copies is
 * returned unchanged.
 */
export function liftSiteChrome<P extends ChromePage>(content: {
  header: HeaderData;
  footer: FooterData;
  pages: P[];
}): { header: HeaderData; footer: FooterData; pages: P[] } {
  if (!content.pages.some((page) => page.sections.some(isChromeCopy))) return content;

  const isHome = (page: P) => page.pageType === "HOME" || page.slug === "/";
  const ordered = [...content.pages.filter(isHome), ...content.pages.filter((page) => !isHome(page))];
  const find = (type: "header" | "footer") =>
    ordered.flatMap((page) => page.sections).find((section) => isChromeCopy(section) && section.type === type);
  const headerSection = find("header");
  const footerSection = find("footer");

  return {
    header: headerSection ? fromSection(content.header, headerSection) : content.header,
    footer: footerSection ? fromSection(content.footer, footerSection) : content.footer,
    pages: content.pages.map((page) =>
      page.sections.some(isChromeCopy)
        ? { ...page, sections: page.sections.filter((section) => !isChromeCopy(section)) }
        : page,
    ),
  };
}
