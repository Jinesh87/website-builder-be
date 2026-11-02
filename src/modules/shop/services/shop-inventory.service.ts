import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, ShopOrderStatus } from "../../../generated/prisma/client.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { purgeShopPages } from "./shop-cache.js";
import { refundStatusLabel } from "./shop-checkout.service.js";
import { readOptionSets } from "./shop.service.js";
import type { ShopRefundStatusLabel } from "../types/shop-auth.types.js";

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
  /** Distinct RETURNED orders that include this product. */
  returnedOrderCount: number;
};

export type ProductReturnedOrderItem = {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

export type ProductReturnedOrder = {
  id: string;
  number: string;
  status: "returned";
  refundStatus: ShopRefundStatusLabel;
  totalPaise: number;
  returnReason: string | null;
  customerName: string;
  customerEmail: string;
  returnedAt: string;
  createdAt: string;
  items: ProductReturnedOrderItem[];
};

export type ProductReturnedOrdersView = {
  productId: string;
  productName: string;
  orders: ProductReturnedOrder[];
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
    const productIds = [...new Set(variants.map((variant) => variant.product.id))];
    const returnedByProduct = new Map<string, number>();
    if (productIds.length > 0) {
      const returnedItems = await prisma.shopOrderItem.findMany({
        where: {
          productId: { in: productIds },
          order: { websiteId, status: ShopOrderStatus.RETURNED },
        },
        select: { productId: true, orderId: true },
      });
      const orderIdsByProduct = new Map<string, Set<string>>();
      for (const item of returnedItems) {
        if (!item.productId) continue;
        const set = orderIdsByProduct.get(item.productId) ?? new Set<string>();
        set.add(item.orderId);
        orderIdsByProduct.set(item.productId, set);
      }
      for (const [productId, orderIds] of orderIdsByProduct) {
        returnedByProduct.set(productId, orderIds.size);
      }
    }
    return variants.map((variant) => toRow(variant, returnedByProduct.get(variant.product.id) ?? 0));
  }

  async listProductReturns(websiteId: string, productId: string, actor: AuthUser): Promise<ProductReturnedOrdersView> {
    await this.openShop(websiteId, actor);
    const product = await prisma.product.findFirst({
      where: { id: productId, websiteId },
      select: { id: true, name: true },
    });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    const orders = await prisma.shopOrder.findMany({
      where: {
        websiteId,
        status: ShopOrderStatus.RETURNED,
        items: { some: { productId } },
      },
      include: {
        customer: { select: { fullName: true, email: true } },
        items: {
          where: { productId },
          orderBy: { productName: "asc" },
        },
        events: {
          where: { status: ShopOrderStatus.RETURNED },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return {
      productId: product.id,
      productName: product.name,
      orders: orders.map((order) => ({
        id: order.id,
        number: String(order.number),
        status: "returned" as const,
        refundStatus: refundStatusLabel(order.refundStatus),
        totalPaise: order.totalPaise,
        returnReason: order.returnReason,
        customerName: order.customer.fullName,
        customerEmail: order.customer.email,
        returnedAt: (order.events[0]?.createdAt ?? order.updatedAt).toISOString(),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPricePaise: item.unitPricePaise,
          lineTotalPaise: item.lineTotalPaise,
        })),
      })),
    };
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

    const returnedItems = await prisma.shopOrderItem.findMany({
      where: {
        productId: variant.product.id,
        order: { websiteId, status: ShopOrderStatus.RETURNED },
      },
      select: { orderId: true },
    });
    const returnedOrderCount = new Set(returnedItems.map((item) => item.orderId)).size;
    return toRow({ ...variant, quantity: updated.quantity }, returnedOrderCount);
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
    category: { name: string } | null;
  };
};

function toRow(variant: StockVariant, returnedOrderCount: number): InventoryRow {
  return {
    variantId: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    categoryName: variant.product.category?.name ?? "",
    variantName: variant.name,
    options: variantOptions(variant.product.optionSets, variant.name),
    pricePaise: variant.pricePaise,
    quantity: variant.quantity,
    returnedOrderCount,
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
