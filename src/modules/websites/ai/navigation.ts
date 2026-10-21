import type { PlannedLink, SectionEnvelope } from "./ai-ops.js";

/** Matches the editor's header menu limit. */
export const MAX_MENU_LINKS = 12;

/** A header menu item; extra fields (children, badge, icon) are carried through untouched. */
export type MenuItem = PlannedLink & Record<string, unknown>;

export type NavPage = { name: string; slug: string };

export type NavigationChange = {
  headerMenu?: MenuItem[];
  headerCta?: PlannedLink;
  /** Labels of planned links that point to no page, so they were left out. */
  unresolved: string[];
};

const EXTERNAL_HREF = /^(https?:\/\/|mailto:|tel:|#.|\/\/)/i;

function pathKey(value: string): string {
  return `/${value.trim().toLowerCase().replace(/^\/+|\/+$/g, "")}`;
}

function nameKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Maps a planned href to a real destination: an existing or newly planned page slug (matched by slug,
 * then by page name or label), an in-page anchor, or an external URL. Null means no such page exists.
 */
export function resolveNavHref(href: string, label: string, pages: readonly NavPage[]): string | null {
  const raw = href.trim();
  if (EXTERNAL_HREF.test(raw)) return raw;
  if (raw && raw !== "#") {
    const bySlug = pages.find((p) => pathKey(p.slug) === pathKey(raw));
    if (bySlug) return bySlug.slug;
  }
  const candidates = [nameKey(raw.replace(/^\/+/, "")), nameKey(label)].filter(Boolean);
  const byName = pages.find((p) => {
    const keys = [nameKey(p.name), nameKey(p.slug.replace(/^\/+/, ""))];
    return candidates.some((candidate) => keys.includes(candidate));
  });
  if (byName) return byName.slug;
  return candidates.includes("home") ? (pages.find((p) => pathKey(p.slug) === "/")?.slug ?? "/") : null;
}

export function readLink(value: unknown): PlannedLink | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const { label, href } = value as Record<string, unknown>;
  return typeof label === "string" && typeof href === "string" ? { label, href } : undefined;
}

export function readMenu(value: unknown): MenuItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item): MenuItem[] => {
    const link = readLink(item);
    return link ? [{ ...(item as Record<string, unknown>), ...link }] : [];
  });
}

function sameLinks(a: readonly PlannedLink[], b: readonly PlannedLink[]): boolean {
  return a.length === b.length && a.every((link, i) => link.label === b[i]?.label && link.href === b[i]?.href);
}

/**
 * Works out the real header change: the planned menu (or the current one) with every href resolved to a
 * real page, duplicates removed, newly created pages appended, and nothing returned when nothing changes.
 */
export function planNavigation(input: {
  currentMenu: readonly MenuItem[];
  currentCta?: PlannedLink;
  plannedMenu?: readonly PlannedLink[] | null;
  plannedCta?: PlannedLink | null;
  newNavPages: readonly NavPage[];
  pages: readonly NavPage[];
}): NavigationChange {
  const unresolved: string[] = [];
  const resolve = (link: PlannedLink): MenuItem | null => {
    const href = resolveNavHref(link.href, link.label, input.pages);
    if (!href) {
      unresolved.push(link.label);
      return null;
    }
    const existing = input.currentMenu.find((item) => pathKey(item.href) === pathKey(href));
    return { ...existing, label: link.label.trim(), href };
  };

  const base = input.plannedMenu
    ? input.plannedMenu.flatMap((link) => resolve(link) ?? [])
    : [...input.currentMenu];
  const additions = input.newNavPages.map((page) => ({ label: page.name, href: page.slug }));

  const seen = new Set<string>();
  const menu = [...base, ...additions]
    .filter((item) => {
      const key = EXTERNAL_HREF.test(item.href) ? item.href : pathKey(item.href);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_MENU_LINKS);

  const cta = input.plannedCta ? resolve(input.plannedCta) : null;
  const ctaLink = cta ? { label: cta.label, href: cta.href } : undefined;

  return {
    ...(sameLinks(menu, input.currentMenu) ? {} : { headerMenu: menu }),
    ...(ctaLink && !(input.currentCta && sameLinks([ctaLink], [input.currentCta])) ? { headerCta: ctaLink } : {}),
    unresolved,
  };
}

/** Writes a navigation change into a header section, so every page header shows the same menu. */
export function withNavigation(section: SectionEnvelope, change: Omit<NavigationChange, "unresolved">): SectionEnvelope {
  if (section.type !== "header" || (!change.headerMenu && !change.headerCta)) return section;
  return {
    ...section,
    data: {
      ...section.data,
      ...(change.headerMenu ? { menu: change.headerMenu } : {}),
      ...(change.headerCta ? { cta: change.headerCta } : {}),
    },
  };
}
