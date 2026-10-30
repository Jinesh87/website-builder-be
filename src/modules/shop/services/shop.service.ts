import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { MediaKind } from "../../../generated/prisma/enums.js";
import { mediaUrl } from "../../media/services/media.service.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { purgeShopPages } from "./shop-cache.js";
import type {
  PublicShopProduct,
  PublicShopVariant,
  ShopCategoryInput,
  ShopCategoryView,
  ShopImageInput,
  ShopImageView,
  ShopOptionSetInput,
  ShopOptionSetView,
  ShopProductInput,
  PublicShopList,
  PublicShopListQuery,
  ShopProductPage,
  ShopProductQuery,
  ShopProductView,
  ShopVariantView,
} from "../types/shop.types.js";

const MAX_CATEGORIES = 100;
const MAX_PRODUCTS = 500;
const PRODUCT_PAGE_SIZES = [10, 20, 50] as const;
const MAX_VARIANTS = 100;
const MAX_IMAGES = 8;

const productInclude = {
  category: { select: { name: true } },
  variants: { orderBy: { sortOrder: "asc" as const } },
} as const satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "item";
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toVariant(variant: ProductRow["variants"][number]): ShopVariantView {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    pricePaise: variant.pricePaise,
    sortOrder: variant.sortOrder,
    quantity: variant.quantity,
    images: readImages(variant.images),
  };
}

function toProduct(product: ProductRow): ShopProductView {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    optionSets: readOptionSets(product.optionSets),
    images: readImages(product.images),
    variants: product.variants.map(toVariant),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function optionValues(optionSets: ShopOptionSetView[], variantName: string): { name: string; value: string; list?: boolean }[] {
  for (const set of optionSets) {
    if (set.options.length === 0) continue;
    const combos = set.options.reduce<string[][]>(
      (sets, option) => sets.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
      [[]],
    );
    for (const values of combos) {
      if (values.join(" / ") === variantName) {
        return set.options.map((option, index) => ({
          name: option.name,
          value: values[index] ?? "",
          ...(option.listOnShop ? { list: true } : {}),
        }));
      }
    }
  }
  return [];
}

/** Photos uploaded for one option value, such as every black size. Later options win. */
function sharedValueImages(optionSets: ShopOptionSetView[], variantName: string): ShopImageView[] {
  for (const set of optionSets) {
    if (set.options.length === 0) continue;
    const combos = set.options.reduce<string[][]>(
      (sets, option) => sets.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
      [[]],
    );
    const match = combos.findIndex((values) => values.join(" / ") === variantName);
    if (match < 0) continue;
    const values = combos[match] ?? [];
    for (let index = set.options.length - 1; index >= 0; index -= 1) {
      const option = set.options[index];
      const value = values[index] ?? "";
      const photos = option?.images?.find((group) => group.value.toLowerCase() === value.toLowerCase())?.images ?? [];
      if (photos.length > 0) return photos;
    }
  }
  return [];
}

function toPublicProduct(product: ProductRow): PublicShopProduct {
  const optionSets = readOptionSets(product.optionSets);
  const variants: PublicShopVariant[] = product.variants.map((variant) => {
    const own = readImages(variant.images);
    const images = own.length > 0 ? own : sharedValueImages(optionSets, variant.name);
    return {
    id: variant.id,
    name: variant.name,
    pricePaise: variant.pricePaise,
    quantity: variant.quantity,
    images: images.map(({ url, alt }) => ({ url, alt })),
    options: optionValues(optionSets, variant.name),
    };
  });
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.category.name,
    images: readImages(product.images).map(({ url, alt }) => ({ url, alt })),
    variants,
  };
}

function readImages(value: Prisma.JsonValue): ShopImageView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const image = entry as { mediaId?: unknown; alt?: unknown };
    if (typeof image.mediaId !== "string") return [];
    return [{ mediaId: image.mediaId, url: mediaUrl(image.mediaId), alt: typeof image.alt === "string" ? image.alt : "" }];
  });
}

export function readOptionSets(value: Prisma.JsonValue): ShopOptionSetView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const set = entry as { pricePaise?: unknown; options?: unknown; overrides?: unknown; skus?: unknown; images?: unknown };
    if (typeof set.pricePaise !== "number" || !Array.isArray(set.options)) return [];
    const options = set.options.flatMap((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return [];
      const row = option as { name?: unknown; values?: unknown; listOnShop?: unknown; images?: unknown };
      if (typeof row.name !== "string" || !Array.isArray(row.values)) return [];
      const values = row.values.filter((item): item is string => typeof item === "string");
      const images = Array.isArray(row.images)
        ? row.images.flatMap((group) => {
            if (!group || typeof group !== "object" || Array.isArray(group)) return [];
            const photo = group as { value?: unknown; images?: unknown };
            if (typeof photo.value !== "string" || !Array.isArray(photo.images)) return [];
            const photos = readImages(photo.images as Prisma.JsonValue);
            if (photos.length === 0) return [];
            return [{ value: photo.value, images: photos }];
          })
        : [];
      return [{ name: row.name, values, ...(row.listOnShop === true ? { listOnShop: true } : {}), ...(images.length ? { images } : {}) }];
    });
    const overrides = Array.isArray(set.overrides)
      ? set.overrides.flatMap((override) => {
          if (!override || typeof override !== "object" || Array.isArray(override)) return [];
          const row = override as { key?: unknown; pricePaise?: unknown };
          if (typeof row.key !== "string" || typeof row.pricePaise !== "number") return [];
          return [{ key: row.key, pricePaise: row.pricePaise }];
        })
      : [];
    const skus = Array.isArray(set.skus)
      ? set.skus.flatMap((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
          const row = entry as { key?: unknown; sku?: unknown };
          if (typeof row.key !== "string" || typeof row.sku !== "string") return [];
          const sku = row.sku.trim();
          if (!sku) return [];
          return [{ key: row.key, sku }];
        })
      : [];
    const images = Array.isArray(set.images)
      ? set.images.flatMap((group) => {
          if (!group || typeof group !== "object" || Array.isArray(group)) return [];
          const row = group as { key?: unknown; images?: unknown };
          if (typeof row.key !== "string" || !Array.isArray(row.images)) return [];
          const photos = readImages(row.images as Prisma.JsonValue);
          if (photos.length === 0) return [];
          return [{ key: row.key, images: photos }];
        })
      : [];
    return [{
      pricePaise: set.pricePaise,
      options,
      ...(overrides.length ? { overrides } : {}),
      ...(skus.length ? { skus } : {}),
      ...(images.length ? { images } : {}),
    }];
  });
}

async function allocateSlug(
  tx: Prisma.TransactionClient,
  websiteId: string,
  name: string,
  kind: "category" | "product",
  excludeId?: string,
): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const slug = `${base.slice(0, 80 - suffix.length)}${suffix}`;
    const where = { websiteId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
    const existing =
      kind === "category"
        ? await tx.shopCategory.findFirst({ where, select: { id: true } })
        : await tx.product.findFirst({ where, select: { id: true } });
    if (!existing) return slug;
  }
  throw new AppError(409, "Choose a different name.", "NAME_TAKEN");
}

export class ShopService {
  private async openShop(websiteId: string, actor: AuthUser): Promise<{ id: string; clientId: string }> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: {
        id: true,
        clientId: true,
        shopEnabled: true,
        client: { select: { shopFeatureEnabled: true } },
      },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before adding products.", "SHOP_OFF");
    }
    return { id: website.id, clientId: website.clientId };
  }

  async listCategories(websiteId: string, actor: AuthUser): Promise<ShopCategoryView[]> {
    await this.openShop(websiteId, actor);
    const categories = await prisma.shopCategory.findMany({
      where: { websiteId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
    }));
  }

  async createCategory(websiteId: string, input: ShopCategoryInput, actor: AuthUser): Promise<ShopCategoryView> {
    const website = await this.openShop(websiteId, actor);
    const name = input.name.trim();
    const count = await prisma.shopCategory.count({ where: { websiteId } });
    if (count >= MAX_CATEGORIES) {
      throw new AppError(409, `A shop can have up to ${MAX_CATEGORIES} categories.`, "CATEGORY_LIMIT");
    }
    await this.assertCategoryNameFree(websiteId, name);

    const category = await prisma.$transaction(async (tx) => {
      const slug = await allocateSlug(tx, websiteId, name, "category");
      return tx.shopCategory.create({
        data: { websiteId, clientId: website.clientId, name, slug },
      });
    });
    return { id: category.id, name: category.name, slug: category.slug, productCount: 0 };
  }

  async updateCategory(
    websiteId: string,
    categoryId: string,
    input: ShopCategoryInput,
    actor: AuthUser,
  ): Promise<ShopCategoryView> {
    await this.openShop(websiteId, actor);
    const current = await this.findCategory(websiteId, categoryId);
    const name = input.name.trim();
    await this.assertCategoryNameFree(websiteId, name, categoryId);

    const category = await prisma.$transaction(async (tx) => {
      const slug =
        name.toLowerCase() === current.name.toLowerCase()
          ? current.slug
          : await allocateSlug(tx, websiteId, name, "category", categoryId);
      return tx.shopCategory.update({
        where: { id: categoryId },
        data: { name, slug },
        include: { _count: { select: { products: true } } },
      });
    });
    purgeShopPages(websiteId);
    return { id: category.id, name: category.name, slug: category.slug, productCount: category._count.products };
  }

  async deleteCategory(websiteId: string, categoryId: string, actor: AuthUser): Promise<void> {
    await this.openShop(websiteId, actor);
    const category = await prisma.shopCategory.findFirst({
      where: { id: categoryId, websiteId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");
    if (category._count.products > 0) {
      throw new AppError(409, "Move or delete the products in this category first.", "CATEGORY_IN_USE");
    }
    await prisma.shopCategory.delete({ where: { id: categoryId } });
  }

  async listProducts(websiteId: string, query: ShopProductQuery, actor: AuthUser): Promise<ShopProductPage> {
    await this.openShop(websiteId, actor);
    const search = query.search?.trim();
    const requestedSize = Number(query.pageSize);
    const pageSize = PRODUCT_PAGE_SIZES.includes(requestedSize as (typeof PRODUCT_PAGE_SIZES)[number]) ? requestedSize : 20;
    const where: Prisma.ProductWhereInput = {
      websiteId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { category: { name: { contains: search, mode: "insensitive" } } },
              { variants: { some: { name: { contains: search, mode: "insensitive" } } } },
              { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const total = await prisma.product.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const requestedPage = Number(query.page);
    const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1), pageCount);
    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { products: products.map(toProduct), page, pageSize, total };
  }

  async createProduct(websiteId: string, input: ShopProductInput, actor: AuthUser): Promise<ShopProductView> {
    const website = await this.openShop(websiteId, actor);
    await this.findCategory(websiteId, input.categoryId);
    const count = await prisma.product.count({ where: { websiteId } });
    if (count >= MAX_PRODUCTS) {
      throw new AppError(409, `A shop can have up to ${MAX_PRODUCTS} products.`, "PRODUCT_LIMIT");
    }
    const expanded = expandOptionSets(input.optionSets);
    const images = await this.resolveImages(website.clientId, input.images ?? []);
    await this.assertImages(website.clientId, imageIds(expanded));

    const product = await prisma.$transaction(async (tx) => {
      const slug = await allocateSlug(tx, websiteId, input.name, "product");
      const created = await tx.product.create({
        data: {
          websiteId,
          clientId: website.clientId,
          categoryId: input.categoryId,
          name: input.name.trim(),
          slug,
          description: emptyToNull(input.description),
          optionSets: expanded.stored as Prisma.InputJsonValue,
          images: images as Prisma.InputJsonValue,
          variants: { create: variantRows(expanded.variants) },
        },
        include: productInclude,
      });
      return created;
    });
    purgeShopPages(websiteId);
    return toProduct(product);
  }

  async updateProduct(
    websiteId: string,
    productId: string,
    input: ShopProductInput,
    actor: AuthUser,
  ): Promise<ShopProductView> {
    await this.openShop(websiteId, actor);
    const current = await this.findProduct(websiteId, productId);
    await this.findCategory(websiteId, input.categoryId);
    const expanded = expandOptionSets(input.optionSets);
    const images = await this.resolveImages(current.clientId, input.images ?? []);
    await this.assertImages(current.clientId, imageIds(expanded));

    const product = await prisma.$transaction(async (tx) => {
      const slug =
        input.name.trim().toLowerCase() === current.name.toLowerCase()
          ? current.slug
          : await allocateSlug(tx, websiteId, input.name, "product", productId);
      const existing = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true, name: true, quantity: true },
      });
      const kept = new Set(expanded.variants.map((variant) => variant.name.toLowerCase()));
      const removed = existing.filter((variant) => variant.quantity > 0 && !kept.has(variant.name.toLowerCase()));
      if (removed.length > 0) {
        await tx.inventoryMovement.createMany({
          data: removed.map((variant) => ({
            websiteId,
            clientId: current.clientId,
            productId,
            variantId: variant.id,
            productName: input.name.trim(),
            variantName: variant.name,
            delta: -variant.quantity,
            quantityAfter: 0,
            note: "Variant removed",
            userId: actor.id,
          })),
        });
      }
      const quantities = new Map(existing.map((variant) => [variant.name.toLowerCase(), variant.quantity]));
      await tx.productVariant.deleteMany({ where: { productId } });
      return tx.product.update({
        where: { id: productId },
        data: {
          categoryId: input.categoryId,
          name: input.name.trim(),
          slug,
          description: emptyToNull(input.description),
          optionSets: expanded.stored as Prisma.InputJsonValue,
          images: images as Prisma.InputJsonValue,
          variants: { create: variantRows(expanded.variants, quantities) },
        },
        include: productInclude,
      });
    });
    purgeShopPages(websiteId);
    return toProduct(product);
  }

  async deleteProduct(websiteId: string, productId: string, actor: AuthUser): Promise<void> {
    await this.openShop(websiteId, actor);
    const product = await prisma.product.findFirst({
      where: { id: productId, websiteId },
      select: { id: true, name: true, clientId: true, variants: { select: { id: true, name: true, quantity: true } } },
    });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
    const stocked = product.variants.filter((variant) => variant.quantity > 0);
    await prisma.$transaction(async (tx) => {
      if (stocked.length > 0) {
        await tx.inventoryMovement.createMany({
          data: stocked.map((variant) => ({
            websiteId,
            clientId: product.clientId,
            productId,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            delta: -variant.quantity,
            quantityAfter: 0,
            note: "Product deleted",
            userId: actor.id,
          })),
        });
      }
      await tx.product.delete({ where: { id: productId } });
    });
    purgeShopPages(websiteId);
  }

  /** Catalogue for published product sections. Empty when the shop is off. */
  async publicCatalog(websiteId: string): Promise<PublicShopProduct[]> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { shopEnabled: true, client: { select: { shopFeatureEnabled: true } } },
    });
    if (!website?.shopEnabled || !website.client.shopFeatureEnabled) return [];
    const products = await prisma.product.findMany({
      where: { websiteId },
      include: productInclude,
      orderBy: { name: "asc" },
      take: MAX_PRODUCTS,
    });
    return products.map(toPublicProduct);
  }

  private async resolveImages(clientId: string, images: ShopImageInput[]): Promise<{ mediaId: string; alt: string }[]> {
    const ordered = images.filter((image, index) => images.findIndex((item) => item.mediaId === image.mediaId) === index).slice(0, MAX_IMAGES);
    if (ordered.length === 0) return [];
    const files = await prisma.mediaFile.findMany({
      where: { id: { in: ordered.map((image) => image.mediaId) }, clientId, kind: MediaKind.IMAGE },
      select: { id: true },
    });
    const found = new Set(files.map((file) => file.id));
    if (ordered.some((image) => !found.has(image.mediaId))) {
      throw new AppError(400, "One of these images is no longer available. Upload it again.", "IMAGE_NOT_FOUND");
    }
    return ordered.map((image) => ({ mediaId: image.mediaId, alt: image.alt?.trim() ?? "" }));
  }

  private async assertImages(clientId: string, mediaIds: string[]): Promise<void> {
    const ids = [...new Set(mediaIds)];
    if (ids.length === 0) return;
    const files = await prisma.mediaFile.findMany({
      where: { id: { in: ids }, clientId, kind: MediaKind.IMAGE },
      select: { id: true },
    });
    if (files.length !== ids.length) {
      throw new AppError(400, "One of these images is no longer available. Upload it again.", "IMAGE_NOT_FOUND");
    }
  }

  private async findCategory(websiteId: string, categoryId: string) {
    const category = await prisma.shopCategory.findFirst({ where: { id: categoryId, websiteId } });
    if (!category) throw new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");
    return category;
  }

  private async findProduct(websiteId: string, productId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, websiteId } });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
    return product;
  }

  private async assertCategoryNameFree(websiteId: string, name: string, excludeId?: string): Promise<void> {
    const existing = await prisma.shopCategory.findFirst({
      where: { websiteId, name: { equals: name, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new AppError(409, "A category with this name already exists.", "CATEGORY_NAME_TAKEN");
  }

}

type ExpandedVariant = { name: string; sku: string | null; pricePaise: number; images: { mediaId: string; alt: string }[] };

function variantImages(images: ShopImageInput[] | undefined): { mediaId: string; alt: string }[] {
  const list = images ?? [];
  return list
    .filter((image, index) => list.findIndex((item) => item.mediaId === image.mediaId) === index)
    .slice(0, MAX_IMAGES)
    .map((image) => ({ mediaId: image.mediaId, alt: image.alt?.trim() ?? "" }));
}

/** Joins option values so the same combination can be recognised when editing. */
export function variantKey(values: string[]): string {
  return values.map((value) => value.trim().toLowerCase()).join("\u001f");
}

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((sets, list) => sets.flatMap((prefix) => list.map((value) => [...prefix, value])), [[]]);
}

function imageIds(expanded: { stored: ShopOptionSetInput[]; variants: ExpandedVariant[] }): string[] {
  return [
    ...expanded.variants.flatMap((variant) => variant.images.map((image) => image.mediaId)),
    ...expanded.stored.flatMap((set) => set.options.flatMap((option) => (option.images ?? []).flatMap((group) => group.images.map((image) => image.mediaId)))),
  ];
}

export function expandOptionSets(sets: ShopOptionSetInput[]): { stored: ShopOptionSetInput[]; variants: ExpandedVariant[] } {
  const seen = new Map<string, string>();
  const stored: ShopOptionSetInput[] = [];
  const variants: ExpandedVariant[] = [];

  for (const set of sets) {
    const options = set.options
      .map((option) => {
        const values = option.values.map((value) => value.trim()).filter(Boolean);
        const images = (option.images ?? [])
          .map((group) => ({ value: group.value.trim(), images: variantImages(group.images) }))
          .filter((group) => group.images.length > 0 && values.some((value) => value.toLowerCase() === group.value.toLowerCase()));
        const seenValues = new Set<string>();
        const uniqueImages = images.filter((group) => {
          const key = group.value.toLowerCase();
          if (seenValues.has(key)) return false;
          seenValues.add(key);
          return true;
        });
        return {
          name: option.name.trim(),
          values,
          ...(option.listOnShop ? { listOnShop: true } : {}),
          ...(uniqueImages.length > 0 ? { images: uniqueImages } : {}),
        };
      })
      .filter((option) => option.name || option.values.length);
    const optionNames = new Set<string>();
    for (const option of options) {
      if (!option.name) throw new AppError(400, "Name each option, such as Size or Colour.", "OPTION_NAME_REQUIRED");
      if (option.values.length === 0) throw new AppError(400, `Add at least one ${option.name}.`, "OPTION_VALUE_REQUIRED");
      const nameKey = option.name.toLowerCase();
      if (optionNames.has(nameKey)) throw new AppError(409, `“${option.name}” is listed twice in one combination.`, "OPTION_DUPLICATE");
      optionNames.add(nameKey);
      const valueKeys = new Set<string>();
      for (const value of option.values) {
        const valueKey = value.toLowerCase();
        if (valueKeys.has(valueKey)) throw new AppError(409, `“${value}” is repeated for ${option.name}.`, "OPTION_VALUE_DUPLICATE");
        valueKeys.add(valueKey);
      }
    }

    const combos = options.length === 0 ? [[]] : cartesian(options.map((option) => option.values));
    const overrides = new Map((set.overrides ?? []).map((override) => [override.key, override.pricePaise]));
    const skuMap = new Map(
      (set.skus ?? [])
        .map((row) => [row.key, row.sku.trim()] as const)
        .filter((row) => row[1].length > 0),
    );
    const imageGroups = new Map((set.images ?? []).map((group) => [group.key, variantImages(group.images)]));
    const keptOverrides: { key: string; pricePaise: number }[] = [];
    const keptSkus: { key: string; sku: string }[] = [];
    const keptImages: { key: string; images: { mediaId: string; alt: string }[] }[] = [];

    for (const values of combos) {
      const key = variantKey(values);
      const label = values.length > 0 ? values.join(" / ") : "Standard";
      if (seen.has(key)) {
        throw new AppError(409, `${label} is already included in another combination.`, "VARIANT_DUPLICATE");
      }
      seen.set(key, label);
      if (label.length > 160) throw new AppError(400, "Shorten the option values. One variant name is too long.", "VARIANT_NAME_TOO_LONG");
      const override = overrides.get(key);
      const pricePaise = override ?? set.pricePaise;
      if (override !== undefined && override !== set.pricePaise) keptOverrides.push({ key, pricePaise: override });
      const sku = skuMap.get(key) ?? null;
      if (sku) keptSkus.push({ key, sku });
      const images = imageGroups.get(key) ?? [];
      if (images.length > 0) keptImages.push({ key, images });
      variants.push({ name: label, sku, pricePaise, images });
    }

    stored.push({
      pricePaise: set.pricePaise,
      options,
      ...(keptOverrides.length > 0 ? { overrides: keptOverrides } : {}),
      ...(keptSkus.length > 0 ? { skus: keptSkus } : {}),
      ...(keptImages.length > 0 ? { images: keptImages } : {}),
    });
  }

  if (variants.length === 0) throw new AppError(400, "Add at least one variant.", "VARIANT_REQUIRED");
  if (variants.length > MAX_VARIANTS) {
    throw new AppError(409, `A product can have at most ${MAX_VARIANTS} variants. Split the options or remove some values.`, "VARIANT_LIMIT");
  }
  return { stored, variants };
}

function variantRows(
  variants: ExpandedVariant[],
  quantities = new Map<string, number>(),
): Prisma.ProductVariantCreateWithoutProductInput[] {
  return variants.map((variant, index) => ({
    id: randomUUID(),
    name: variant.name,
    sku: variant.sku,
    pricePaise: variant.pricePaise,
    quantity: quantities.get(variant.name.toLowerCase()) ?? 0,
    images: variant.images as Prisma.InputJsonValue,
    sortOrder: index,
  }));
}

export const shopService = new ShopService();

const SHOP_LIST_SORTS = ["featured", "price-low", "price-high", "name"] as const;
export const SHOP_LIST_PAGE_SIZES = [8, 12, 24, 48] as const;
const DEFAULT_SHOP_LIST_PAGE_SIZE = 12;

type PublicListing = {
  product: PublicShopProduct;
  variants: PublicShopVariant[];
  label: string;
};

/** Same card split as the storefront: each option marked `list` becomes its own card. */
function publicListings(product: PublicShopProduct): PublicListing[] {
  const groups = new Map<string, PublicListing>();
  for (const variant of product.variants) {
    const listed = variant.options.filter((option) => option.list);
    const key = listed.length ? listed.map((option) => `${option.name.toLowerCase()}=${option.value.toLowerCase()}`).join("&") : "*";
    const existing = groups.get(key);
    if (existing) {
      existing.variants.push(variant);
      continue;
    }
    groups.set(key, {
      product,
      variants: [variant],
      label: listed.map((option) => option.value).join(" / "),
    });
  }
  if (groups.size === 0) return [{ product, variants: product.variants, label: "" }];
  return [...groups.values()];
}

/** Search, category, and sort run before the page slice, so a page never contains the whole catalogue. */
export function pagePublicCatalog(
  products: PublicShopProduct[],
  query: PublicShopListQuery,
): { products: PublicShopProduct[]; list: PublicShopList } {
  const categories = [...new Set(products.map((product) => product.categoryName).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
  const search = (query.search ?? "").trim();
  const needle = search.toLowerCase();
  const wanted = (query.category ?? "").trim();
  const category =
    !wanted || wanted.toLowerCase() === "all" ? "All" : (categories.find((name) => name.toLowerCase() === wanted.toLowerCase()) ?? wanted);
  const sort = SHOP_LIST_SORTS.includes(query.sort as (typeof SHOP_LIST_SORTS)[number])
    ? (query.sort as PublicShopList["sort"])
    : "featured";
  const pageSize = SHOP_LIST_PAGE_SIZES.includes(query.pageSize as (typeof SHOP_LIST_PAGE_SIZES)[number])
    ? query.pageSize!
    : DEFAULT_SHOP_LIST_PAGE_SIZE;

  let rows = products.flatMap((product) => publicListings(product));
  if (category !== "All") {
    rows = rows.filter((row) => row.product.categoryName.toLowerCase() === category.toLowerCase());
  }
  if (needle) {
    rows = rows.filter((row) => {
      const hay = [row.product.name, row.label, row.product.categoryName, row.product.description ?? "", ...row.variants.map((variant) => variant.name)]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  if (sort === "price-low") rows = [...rows].sort((a, b) => (a.variants[0]?.pricePaise ?? 0) - (b.variants[0]?.pricePaise ?? 0));
  if (sort === "price-high") rows = [...rows].sort((a, b) => (b.variants[0]?.pricePaise ?? 0) - (a.variants[0]?.pricePaise ?? 0));
  if (sort === "name") rows = [...rows].sort((a, b) => a.product.name.localeCompare(b.product.name) || a.label.localeCompare(b.label));

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isFinite(query.page) ? Math.floor(query.page!) : 1;
  const page = Math.min(Math.max(1, requested), pageCount);
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  const ordered: PublicShopProduct[] = [];
  const byId = new Map<string, PublicShopProduct>();
  for (const row of slice) {
    let existing = byId.get(row.product.id);
    if (!existing) {
      existing = { ...row.product, variants: [] };
      byId.set(row.product.id, existing);
      ordered.push(existing);
    }
    existing.variants.push(...row.variants);
  }

  return {
    products: ordered,
    list: { search, category, sort, page, pageSize, total, categories },
  };
}
