import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { PublicShopList, PublicShopListQuery, PublicShopProduct } from "../types/shop.types.js";
import { pagePublicCatalog, productInclude, toPublicProduct, type ProductRow } from "./shop.service.js";

/** Shop-wide settings every public product needs (GST defaults, return window). */
export type PublicShopSettings = { shopReturnDays: number | null; shopGstPercent: number; shopPriceIncludesGst: boolean };

/** Listed products of one shop; the live site never shows unlisted ones. */
function listedWhere(websiteId: string): Prisma.ProductWhereInput {
  return { websiteId, listed: true };
}

/**
 * Loads only the products a live page shows, instead of the whole catalogue:
 * one product for a product page, one page of cards for a shop list, and nothing for other pages.
 */
export class ShopPublicCatalogService {
  /** The shop's settings, or null when the shop is off (then pages show no products). */
  async settings(websiteId: string): Promise<PublicShopSettings | null> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        shopEnabled: true,
        shopReturnDays: true,
        shopGstPercent: true,
        shopPriceIncludesGst: true,
        client: { select: { shopFeatureEnabled: true } },
      },
    });
    if (!website?.shopEnabled || !website.client.shopFeatureEnabled) return null;
    return {
      shopReturnDays: website.shopReturnDays,
      shopGstPercent: website.shopGstPercent ?? 0,
      shopPriceIncludesGst: website.shopPriceIncludesGst !== false,
    };
  }

  /** The listed product at this address (`/shop/<slug>`), or null. */
  async bySlug(websiteId: string, slug: string, shop: PublicShopSettings): Promise<PublicShopProduct | null> {
    const row = await prisma.product.findFirst({ where: { ...listedWhere(websiteId), slug }, include: productInclude });
    return row ? toPublicProduct(row, shop) : null;
  }

  /** The first listed product A–Z: what a product-detail section shows when no product is in the address. */
  async first(websiteId: string, shop: PublicShopSettings): Promise<PublicShopProduct | null> {
    const row = await prisma.product.findFirst({ where: listedWhere(websiteId), include: productInclude, orderBy: [{ name: "asc" }, { id: "asc" }] });
    return row ? toPublicProduct(row, shop) : null;
  }

  /** Listed products with these ids (hand-picked featured products), A–Z. */
  async byIds(websiteId: string, ids: string[], shop: PublicShopSettings): Promise<PublicShopProduct[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.product.findMany({
      where: { ...listedWhere(websiteId), id: { in: ids } },
      include: productInclude,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => toPublicProduct(row, shop));
  }

  /**
   * One page of the shop list with its search, category and sort. Cards are worked out from a light
   * read of the matching products (no photos or descriptions), and full details are loaded only for
   * the products on the requested page.
   */
  async listPage(
    websiteId: string,
    query: PublicShopListQuery,
    shop: PublicShopSettings,
  ): Promise<{ products: PublicShopProduct[]; list: PublicShopList }> {
    const needle = (query.search ?? "").trim();
    const wanted = (query.category ?? "").trim();
    const category = wanted && wanted.toLowerCase() !== "all" ? wanted : null;
    const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });

    // The database narrows by category and search first. Its search is a little wider than a card's
    // (any variant matching keeps the product), and pagePublicCatalog then trims to exact cards.
    const where: Prisma.ProductWhereInput = {
      ...listedWhere(websiteId),
      ...(category ? { category: { name: { equals: category, mode: "insensitive" } } } : {}),
      ...(needle
        ? {
            OR: [
              { name: contains(needle) },
              { description: contains(needle) },
              { category: { name: contains(needle) } },
              { variants: { some: { name: contains(needle) } } },
            ],
          }
        : {}),
    };

    const [slim, categoryRows] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          optionSets: true,
          gstPercent: true,
          priceIncludesGst: true,
          returnsEnabled: true,
          returnDays: true,
          // Only a search reads the description.
          description: Boolean(needle),
          category: { select: { name: true } },
          variants: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, pricePaise: true, quantity: true, sortOrder: true } },
        },
      }),
      prisma.shopCategory.findMany({
        where: { websiteId, products: { some: { listed: true } } },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);

    // Photos aren't needed to work out cards, prices or order; they come with the full rows below.
    const light = slim.map((row) =>
      toPublicProduct(
        {
          ...row,
          description: row.description ?? null,
          images: [],
          variants: row.variants.map((variant) => ({ ...variant, images: [] })),
        } as unknown as ProductRow,
        shop,
      ),
    );
    const paged = pagePublicCatalog(light, query);
    const categories = categoryRows.map((row) => row.name).sort((left, right) => left.localeCompare(right));
    const resolvedCategory =
      paged.list.category === "All"
        ? "All"
        : (categories.find((name) => name.toLowerCase() === paged.list.category.toLowerCase()) ?? paged.list.category);

    const full = new Map(
      (await this.byIds(websiteId, paged.products.map((product) => product.id), shop)).map((product) => [product.id, product]),
    );
    const products = paged.products.flatMap((pageProduct) => {
      const product = full.get(pageProduct.id);
      if (!product) return [];
      // Keep only the variants of the cards on this page, in the order pagePublicCatalog chose.
      const byId = new Map(product.variants.map((variant) => [variant.id, variant]));
      return [{ ...product, variants: pageProduct.variants.flatMap((variant) => byId.get(variant.id) ?? []) }];
    });

    return { products, list: { ...paged.list, category: resolvedCategory, categories } };
  }
}

export const shopPublicCatalogService = new ShopPublicCatalogService();
