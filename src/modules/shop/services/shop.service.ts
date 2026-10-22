import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { MediaKind } from "../../../generated/prisma/enums.js";
import { mediaUrl } from "../../media/services/media.service.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import type {
  ShopCategoryInput,
  ShopCategoryView,
  ShopImageInput,
  ShopImageView,
  ShopOptionSetInput,
  ShopOptionSetView,
  ShopProductInput,
  ShopProductQuery,
  ShopProductView,
  ShopVariantView,
} from "../types/shop.types.js";

const MAX_CATEGORIES = 100;
const MAX_PRODUCTS = 500;
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
    const set = entry as { pricePaise?: unknown; options?: unknown; overrides?: unknown; images?: unknown };
    if (typeof set.pricePaise !== "number" || !Array.isArray(set.options)) return [];
    const options = set.options.flatMap((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return [];
      const row = option as { name?: unknown; values?: unknown };
      if (typeof row.name !== "string" || !Array.isArray(row.values)) return [];
      const values = row.values.filter((item): item is string => typeof item === "string");
      return [{ name: row.name, values }];
    });
    const overrides = Array.isArray(set.overrides)
      ? set.overrides.flatMap((override) => {
          if (!override || typeof override !== "object" || Array.isArray(override)) return [];
          const row = override as { key?: unknown; pricePaise?: unknown };
          if (typeof row.key !== "string" || typeof row.pricePaise !== "number") return [];
          return [{ key: row.key, pricePaise: row.pricePaise }];
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

  async listProducts(websiteId: string, query: ShopProductQuery, actor: AuthUser): Promise<ShopProductView[]> {
    await this.openShop(websiteId, actor);
    const search = query.search?.trim();
    const products = await prisma.product.findMany({
      where: {
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
      },
      include: productInclude,
      orderBy: { name: "asc" },
      take: MAX_PRODUCTS,
    });
    return products.map(toProduct);
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
    await this.assertImages(website.clientId, expanded.variants.flatMap((variant) => variant.images.map((image) => image.mediaId)));

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
    await this.assertImages(current.clientId, expanded.variants.flatMap((variant) => variant.images.map((image) => image.mediaId)));

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

type ExpandedVariant = { name: string; pricePaise: number; images: { mediaId: string; alt: string }[] };

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

export function expandOptionSets(sets: ShopOptionSetInput[]): { stored: ShopOptionSetInput[]; variants: ExpandedVariant[] } {
  const seen = new Map<string, string>();
  const stored: ShopOptionSetInput[] = [];
  const variants: ExpandedVariant[] = [];

  for (const set of sets) {
    const options = set.options
      .map((option) => ({
        name: option.name.trim(),
        values: option.values.map((value) => value.trim()).filter(Boolean),
      }))
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
    const imageGroups = new Map((set.images ?? []).map((group) => [group.key, variantImages(group.images)]));
    const keptOverrides: { key: string; pricePaise: number }[] = [];
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
      const images = imageGroups.get(key) ?? [];
      if (images.length > 0) keptImages.push({ key, images });
      variants.push({ name: label, pricePaise, images });
    }

    stored.push({
      pricePaise: set.pricePaise,
      options,
      ...(keptOverrides.length > 0 ? { overrides: keptOverrides } : {}),
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
    pricePaise: variant.pricePaise,
    quantity: quantities.get(variant.name.toLowerCase()) ?? 0,
    images: variant.images as Prisma.InputJsonValue,
    sortOrder: index,
  }));
}

export const shopService = new ShopService();
