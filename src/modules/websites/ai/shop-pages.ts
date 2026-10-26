import { randomUUID } from "node:crypto";
import type { AiSuggestionPayload } from "../services/ai-generator.service.js";
import type { WebsiteDetail } from "../types/website.types.js";
import type { SectionEnvelope } from "./ai-ops.js";
import type { CreatedPageEdit, NavigationPatchEdit, UpdatedPageEdit } from "./section-edits.js";

const SHOP_SLUG = "/shop";
const PRODUCT_SLUG = "/product";

/** A request to add the shop catalogue, not a rewrite of existing marketing copy. */
export function isShopPageRequest(prompt: string): boolean {
  const asks =
    /\b(new|create|add|make|build|need|want|generate)\b/i.test(prompt) &&
    /\b(product\s+pages?|products\s+pages?|shop\s+pages?|store\s+pages?|product\s+list|product\s+detail|online\s+(?:shop|store)|e-?commerce)\b/i.test(
      prompt,
    );
  return asks;
}

function pathKey(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function section(type: string, data: Record<string, unknown>): SectionEnvelope {
  return {
    id: randomUUID(),
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false },
    data,
  };
}

function shopSections(business: string): SectionEnvelope[] {
  return [
    section("hero", {
      variant: "centered",
      eyebrow: "Shop",
      heading: `Shop ${business}`,
      subheading: "Browse the catalogue. Open a product to see its options, price and how many are in stock.",
    }),
    section("products", {
      eyebrow: "Catalogue",
      title: "Our products",
      subtitle: "Search by name or filter by category.",
      layout: "grid-3",
      showSearch: true,
      showCategoryFilter: true,
      detailBase: PRODUCT_SLUG,
      emptyMessage: "No products yet.",
    }),
  ];
}

function detailSections(): SectionEnvelope[] {
  return [
    section("product_detail", {
      backLabel: "All products",
      backHref: SHOP_SLUG,
      showDescription: true,
      showStock: true,
    }),
  ];
}

/**
 * Builds the shop list page and the product detail page without asking the model.
 * The model was answering these requests with an empty chat reply.
 */
export function shopPagesSuggestion(prompt: string, website: WebsiteDetail | undefined): AiSuggestionPayload | null {
  if (!isShopPageRequest(prompt)) return null;

  const business = website?.info.businessName?.trim() || website?.name?.trim() || "the shop";
  const pages = website?.draft.pages ?? [];
  const find = (slug: string, name: string) =>
    pages.find((page) => pathKey(page.slug) === pathKey(slug) || pathKey(page.name) === pathKey(name));

  const createdPages: CreatedPageEdit[] = [];
  const updatedPages: UpdatedPageEdit[] = [];
  const place = (name: string, slug: string, showInNav: boolean, sections: SectionEnvelope[], seoDescription: string) => {
    const existing = find(slug, name);
    if (existing) {
      updatedPages.push({
        pageId: existing.id,
        name,
        slug,
        showInNav,
        seoTitle: `${name} | ${business}`,
        seoDescription,
        sections,
      });
      return;
    }
    createdPages.push({
      id: randomUUID(),
      name,
      slug,
      pageType: "CUSTOM",
      showInNav,
      seoTitle: `${name} | ${business}`,
      seoDescription,
      sections,
    });
  };

  place("Shop", SHOP_SLUG, true, shopSections(business), `Browse products from ${business}.`);
  place("Product", PRODUCT_SLUG, false, detailSections(), `Product details, options and stock at ${business}.`);

  const menu = [...(website?.draft.header.menu ?? [])];
  const hasShop = menu.some((item) => pathKey(item.href) === pathKey(SHOP_SLUG) || pathKey(item.label) === "shop");
  const navigationPatch: NavigationPatchEdit | undefined = hasShop
    ? undefined
    : { headerMenu: [...menu, { label: "Shop", href: SHOP_SLUG }] };

  const created = createdPages.map((page) => page.name);
  const updated = updatedPages.map((page) => page.name);
  const summary = [
    created.length > 0 ? `Created ${created.join(" and ")}` : "",
    updated.length > 0 ? `Updated ${updated.join(" and ")}` : "",
    navigationPatch ? "Added Shop to the header menu." : "",
    "The shop page lists your products. Each one opens on the product page with its options, price and stock.",
  ]
    .filter(Boolean)
    .join(". ")
    .replace("..", ".");

  return {
    id: randomUUID(),
    prompt,
    summary,
    target: {
      scope: "site",
      createdPageIds: createdPages.map((page) => page.id),
      affectedPageIds: updatedPages.map((page) => page.pageId),
    },
    before: [],
    after: [],
    createdPages,
    updatedPages,
    ...(navigationPatch ? { navigationPatch } : {}),
  };
}
