import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { PosCatalog, PosCatalogProduct } from "../types/shop-pos.types.js";
import { priceOrderLine } from "../utils/shop-order-pricing.js";
import { getReservedQty } from "../utils/shop-stock-hold.js";
import { openPosForAdmin } from "./shop-admin-access.js";
import { readImages, readOptionSets, variantPhotos } from "./shop.service.js";

/** Products per till page; the grid loads the next page as the cashier scrolls. */
export const POS_PAGE_SIZE = 48;
/** Most cart lines one stock check covers. */
export const POS_STOCK_MAX_VARIANTS = 200;

export type PosCatalogQuery = { page?: number; search?: string; categoryId?: string };

const productInclude = {
  category: { select: { id: true, name: true } },
  variants: { orderBy: { sortOrder: "asc" } },
} as const satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type GstDefaults = { shopGstPercent: number | null; shopPriceIncludesGst: boolean | null };

/** Units that can be sold now: on hand minus units held by online checkouts in progress. */
async function availability(websiteId: string, variants: { id: string; quantity: number }[]): Promise<Map<string, number>> {
  const reserved = await Promise.all(variants.map((variant) => getReservedQty(websiteId, variant.id)));
  return new Map(variants.map((variant, index) => [variant.id, Math.max(0, variant.quantity - reserved[index])]));
}

/** A product as the till shows it, priced with GST and with live availability per variant. */
function toPosProduct(product: ProductRow, gst: GstDefaults, available: Map<string, number>): PosCatalogProduct {
  const optionSets = readOptionSets(product.optionSets);
  const variants = product.variants.map((variant) => {
    const pricing = priceOrderLine(product, gst, variant.pricePaise, 1);
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      imageUrl: variantPhotos(variant, optionSets)[0]?.url ?? null,
      unitPaise: pricing.unitPayable,
      gstPercent: pricing.gst.gstPercent,
      available: available.get(variant.id) ?? 0,
    };
  });
  // Product photo first; otherwise a variant's, preferring one that's in stock.
  const variantPhoto =
    variants.find((variant) => variant.imageUrl && variant.available > 0)?.imageUrl ??
    variants.find((variant) => variant.imageUrl)?.imageUrl ??
    null;
  return {
    id: product.id,
    name: product.name,
    categoryId: product.category?.id ?? null,
    categoryName: product.category?.name ?? null,
    imageUrl: readImages(product.images)[0]?.url ?? variantPhoto,
    listed: product.listed,
    variants,
  };
}

async function gstDefaults(websiteId: string): Promise<GstDefaults> {
  return (
    (await prisma.website.findUnique({
      where: { id: websiteId },
      select: { shopGstPercent: true, shopPriceIncludesGst: true },
    })) ?? { shopGstPercent: null, shopPriceIncludesGst: null }
  );
}

async function toPosProducts(websiteId: string, products: ProductRow[]): Promise<PosCatalogProduct[]> {
  const [gst, available] = await Promise.all([gstDefaults(websiteId), availability(websiteId, products.flatMap((p) => p.variants))]);
  return products.map((product) => toPosProduct(product, gst, available));
}

export class ShopPosCatalogService {
  /**
   * One page of products the till can sell (A–Z), matching `search` in the product, category, variant,
   * SKU or barcode, and optionally one category. Page 1 also carries the category tabs and QR status.
   */
  async page(websiteId: string, query: PosCatalogQuery, actor: AuthUser): Promise<PosCatalog> {
    await openPosForAdmin(websiteId, actor);
    const page = Math.max(1, query.page ?? 1);
    const needle = query.search?.trim();
    const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
    const where: Prisma.ProductWhereInput = {
      websiteId,
      variants: { some: {} },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(needle
        ? {
            OR: [
              { name: contains(needle) },
              { category: { name: contains(needle) } },
              { variants: { some: { OR: [{ name: contains(needle) }, { sku: contains(needle) }, { barcode: contains(needle) }] } } },
            ],
          }
        : {}),
    };

    const [rows, categories, paymentConfig] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * POS_PAGE_SIZE,
        // One extra row tells whether another page follows.
        take: POS_PAGE_SIZE + 1,
        include: productInclude,
      }),
      prisma.shopCategory.findMany({
        where: { websiteId, products: { some: { variants: { some: {} } } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.shopPaymentConfig.findUnique({
        where: { websiteId },
        select: { razorpayKeyId: true, oauthAccessTokenCipher: true, qrCodesEnabled: true },
      }),
    ]);

    return {
      products: await toPosProducts(websiteId, rows.slice(0, POS_PAGE_SIZE)),
      categories,
      razorpayQr: !(paymentConfig?.razorpayKeyId || paymentConfig?.oauthAccessTokenCipher)
        ? "not_connected"
        : paymentConfig.qrCodesEnabled === false
          ? "not_enabled"
          : "ready",
      page,
      hasMore: rows.length > POS_PAGE_SIZE,
    };
  }

  /**
   * The product and variant a scanned or typed code belongs to: an exact barcode first, then an exact
   * SKU (shops that put the barcode number in the SKU keep working). Ignores case and spaces around it.
   */
  async byCode(
    websiteId: string,
    code: string,
    actor: AuthUser,
  ): Promise<{ product: PosCatalogProduct; variantId: string }> {
    await openPosForAdmin(websiteId, actor);
    const wanted = code.trim();
    if (!wanted) throw new AppError(404, "No product with that barcode.", "CODE_NOT_FOUND");
    for (const field of ["barcode", "sku"] as const) {
      const variant = await prisma.productVariant.findFirst({
        where: { product: { websiteId }, [field]: { equals: wanted, mode: "insensitive" } },
        orderBy: { product: { name: "asc" } },
        select: { id: true, product: { include: productInclude } },
      });
      if (variant) {
        const [product] = await toPosProducts(websiteId, [variant.product]);
        return { product, variantId: variant.id };
      }
    }
    throw new AppError(404, `No product with barcode or SKU "${wanted}".`, "CODE_NOT_FOUND");
  }

  /** Units that can be sold now for these variants (the cart's), so the cart can be kept in line. */
  async stock(websiteId: string, variantIds: string[], actor: AuthUser): Promise<Record<string, number>> {
    await openPosForAdmin(websiteId, actor);
    const ids = [...new Set(variantIds)].slice(0, POS_STOCK_MAX_VARIANTS);
    if (ids.length === 0) return {};
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: ids }, product: { websiteId } },
      select: { id: true, quantity: true },
    });
    const available = await availability(websiteId, variants);
    // Variants deleted since they went in the cart come back as 0, so the till drops them.
    return Object.fromEntries(ids.map((id) => [id, available.get(id) ?? 0]));
  }
}

export const shopPosCatalogService = new ShopPosCatalogService();
