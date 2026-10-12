import type { FooterData, HeaderData, Section, ThemeSettings } from "../types/site-content.types.js";
import type { PageView, PublishSnapshot } from "../types/website.types.js";
import { EDITOR_SCHEMA_VERSION } from "../validators/website.validator.js";

type SnapshotSource = {
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageView[];
};

type SnapshotPage = PublishSnapshot["pages"][number];

/** The fields whose change makes a page's sitemap <lastmod> move forward. */
function pageContentKey(page: Omit<SnapshotPage, "lastModified">): string {
  return JSON.stringify([
    page.name,
    page.slug,
    page.pageType,
    page.seoTitle ?? null,
    page.seoDescription ?? null,
    page.sections,
  ]);
}

/**
 * Builds the immutable content of a published version. Hidden pages and hidden
 * sections are dropped so the snapshot holds exactly what visitors may see.
 * Pages unchanged since the previous live version keep their `lastModified`; the rest get `publishedAt`.
 */
export function buildPublishSnapshot(
  source: SnapshotSource,
  publishedAt: Date,
  previous?: { snapshot: PublishSnapshot; publishedAt: Date } | null,
): PublishSnapshot {
  const previousPages = new Map((previous?.snapshot.pages ?? []).map((page) => [page.id, page]));
  const previousPublishedAt = previous?.publishedAt.toISOString();
  const now = publishedAt.toISOString();

  return {
    schemaVersion: EDITOR_SCHEMA_VERSION,
    site: { language: source.theme.language || "en" },
    theme: source.theme,
    header: source.header,
    footer: source.footer,
    pages: source.pages
      .filter((page) => page.visible)
      .map((page) => {
        const next = {
          id: page.id,
          name: page.name,
          slug: page.slug,
          pageType: page.pageType,
          showInNav: page.showInNav,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoKeywords: page.seoKeywords,
          sections: page.sections.filter((section: Section) => !section.hidden),
        };
        const before = previousPages.get(page.id);
        const kept = before && pageContentKey(before) === pageContentKey(next) ? (before.lastModified ?? previousPublishedAt) : undefined;
        return { ...next, lastModified: kept ?? now };
      }),
  };
}
