import type { FooterData, HeaderData, SectionSettings } from "../types/site-content.types.js";

type ChromeSection = { type: string; hidden: boolean; settings: SectionSettings; data: unknown };
type ChromePage = { slug: string; pageType?: string; sections: readonly ChromeSection[] };

export function isChromeSection(section: { type: string }): boolean {
  return section.type === "header" || section.type === "footer";
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
 * are removed from the pages. Content without copies is returned unchanged.
 */
export function liftSiteChrome<P extends ChromePage>(content: {
  header: HeaderData;
  footer: FooterData;
  pages: P[];
}): { header: HeaderData; footer: FooterData; pages: P[] } {
  if (!content.pages.some((page) => page.sections.some(isChromeSection))) return content;

  const isHome = (page: P) => page.pageType === "HOME" || page.slug === "/";
  const ordered = [...content.pages.filter(isHome), ...content.pages.filter((page) => !isHome(page))];
  const find = (type: "header" | "footer") =>
    ordered.flatMap((page) => page.sections).find((section) => section.type === type);
  const headerSection = find("header");
  const footerSection = find("footer");

  return {
    header: headerSection ? fromSection(content.header, headerSection) : content.header,
    footer: footerSection ? fromSection(content.footer, footerSection) : content.footer,
    pages: content.pages.map((page) =>
      page.sections.some(isChromeSection)
        ? { ...page, sections: page.sections.filter((section) => !isChromeSection(section)) }
        : page,
    ),
  };
}
