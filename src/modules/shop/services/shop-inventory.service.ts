import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { purgeShopPages } from "./shop-cache.js";
import { readOptionSets } from "./shop.service.js";

const PAGE_SIZE = 40;
const MAX_ROWS = 2000;

export type InventoryOption = { name: string; value: string };

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  categoryName: string;
  variantName: string;
  options: InventoryOption[];
  pricePaise: number;
  quantity: number;
};

export type InventoryMovementView = {
  id: string;
  productName: string;
  variantName: string;
  delta: number;
  quantityAfter: number;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type InventoryLogPage = {
  movements: InventoryMovementView[];
  page: number;
  pageSize: number;
  total: number;
};

export class ShopInventoryService {
  private async openShop(websiteId: string, actor: AuthUser): Promise<void> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: { id: true, shopEnabled: true, client: { select: { shopFeatureEnabled: true } } },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before changing stock.", "SHOP_OFF");
    }
  }

  async list(websiteId: string, search: string | undefined, actor: AuthUser): Promise<InventoryRow[]> {
    await this.openShop(websiteId, actor);
    const needle = search?.trim();
    const variants = await prisma.productVariant.findMany({
      where: {
        product: { websiteId },
        ...(needle
          ? {
              OR: [
                { name: { contains: needle, mode: "insensitive" } },
                { product: { name: { contains: needle, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { product: { select: { id: true, name: true, optionSets: true, category: { select: { name: true } } } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
      take: MAX_ROWS,
    });
    return variants.map((variant) => toRow(variant));
  }

  async addQuantity(
    websiteId: string,
    variantId: string,
    quantity: number,
    note: string | undefined,
    actor: AuthUser,
  ): Promise<InventoryRow> {
    await this.openShop(websiteId, actor);
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, product: { websiteId } },
      include: {
        product: { select: { id: true, name: true, clientId: true, websiteId: true, optionSets: true, category: { select: { name: true } } } },
      },
    });
    if (!variant) throw new AppError(404, "Variant not found", "VARIANT_NOT_FOUND");
    const next = variant.quantity + quantity;
    if (next > 1_000_000) {
      throw new AppError(400, "That would put this variant over 1,000,000 on hand.", "QUANTITY_TOO_HIGH");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.productVariant.update({
        where: { id: variant.id },
        data: { quantity: next },
      });
      await tx.inventoryMovement.create({
        data: {
          websiteId: variant.product.websiteId,
          clientId: variant.product.clientId,
          productId: variant.product.id,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          delta: quantity,
          quantityAfter: next,
          note: note?.trim() || null,
          userId: actor.id,
        },
      });
      return saved;
    });

    return toRow({ ...variant, quantity: updated.quantity });
  }

  async log(websiteId: string, search: string | undefined, page: number, actor: AuthUser): Promise<InventoryLogPage> {
    await this.openShop(websiteId, actor);
    const needle = search?.trim();
    const where = {
      websiteId,
      ...(needle
        ? {
            OR: [
              { productName: { contains: needle, mode: "insensitive" as const } },
              { variantName: { contains: needle, mode: "insensitive" as const } },
              { note: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await prisma.$transaction([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return {
      movements: rows.map((row) => ({
        id: row.id,
        productName: row.productName,
        variantName: row.variantName,
        delta: row.delta,
        quantityAfter: row.quantityAfter,
        note: row.note,
        actorName: row.user?.fullName ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
    };
  }
}

type StockVariant = {
  id: string;
  name: string;
  pricePaise: number;
  quantity: number;
  product: {
    id: string;
    name: string;
    optionSets: Prisma.JsonValue;
    category: { name: string };
  };
};

function toRow(variant: StockVariant): InventoryRow {
  return {
    variantId: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    categoryName: variant.product.category.name,
    variantName: variant.name,
    options: variantOptions(variant.product.optionSets, variant.name),
    pricePaise: variant.pricePaise,
    quantity: variant.quantity,
  };
}

function variantOptions(optionSets: Prisma.JsonValue, variantName: string): InventoryOption[] {
  for (const set of readOptionSets(optionSets)) {
    if (set.options.length === 0) continue;
    const combos = set.options.reduce<string[][]>(
      (sets, option) => sets.flatMap((prefix) => option.values.map((value) => [...prefix, value])),
      [[]],
    );
    for (const values of combos) {
      if (values.join(" / ") === variantName) {
        return set.options.map((option, index) => ({ name: option.name, value: values[index] ?? "" }));
      }
    }
  }
  return [];
}

export const shopInventoryService = new ShopInventoryService();
