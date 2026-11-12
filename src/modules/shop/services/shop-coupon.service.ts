import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import {
  Prisma,
  ShopCouponDiscountType,
  type ShopCoupon,
} from "../../../generated/prisma/client.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { purgeShopPages } from "./shop-cache.js";

export type ShopCouponDiscountTypeLabel = "PERCENT" | "FIXED_PAISE";

export type ShopCouponView = {
  id: string;
  code: string;
  discountType: ShopCouponDiscountTypeLabel;
  discountValue: number;
  scope: "cart" | "product";
  productId: string | null;
  productName: string | null;
  variantId: string | null;
  variantName: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateShopCouponInput = {
  code: string;
  discountType: ShopCouponDiscountTypeLabel;
  discountValue: number;
  productId?: string | null;
  variantId?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
};

export type UpdateShopCouponInput = {
  discountType?: ShopCouponDiscountTypeLabel;
  discountValue?: number;
  productId?: string | null;
  variantId?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  active?: boolean;
};

export type AppliedShopCoupon = {
  couponId: string;
  code: string;
  listAmountPaise: number;
  eligiblePaise: number;
  discountPaise: number;
  finalAmountPaise: number;
};

export type ShopCouponPreview = {
  code: string;
  listAmountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  scope: "cart" | "product";
};

/** Storefront-safe coupon shown on a product detail page. */
export type PublicShopCoupon = {
  code: string;
  discountType: ShopCouponDiscountTypeLabel;
  discountValue: number;
  scope: "cart" | "product";
  variantId: string | null;
  variantName: string | null;
  expiresAt: string | null;
};

export type ShopCouponRedemptionView = {
  id: string;
  listAmountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  createdAt: string;
  order: {
    id: string;
    number: string;
    status: string;
  };
  customer: {
    id: string;
    fullName: string;
    email: string;
    isGuest: boolean;
  };
};

type CartLine = { productId: string; variantId: string; lineTotalPaise: number };
type Tx = Prisma.TransactionClient;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function discountPaiseFor(
  eligiblePaise: number,
  coupon: Pick<ShopCoupon, "discountType" | "discountValue">,
): number {
  if (eligiblePaise <= 0) return 0;
  if (coupon.discountType === ShopCouponDiscountType.PERCENT) {
    return Math.min(eligiblePaise, Math.floor((eligiblePaise * coupon.discountValue) / 100));
  }
  return Math.min(eligiblePaise, coupon.discountValue);
}

function eligiblePaiseFor(lines: CartLine[], coupon: Pick<ShopCoupon, "productId" | "variantId">): number {
  if (!coupon.productId) {
    return lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  }
  return lines
    .filter((line) => {
      if (line.productId !== coupon.productId) return false;
      if (coupon.variantId && line.variantId !== coupon.variantId) return false;
      return true;
    })
    .reduce((sum, line) => sum + line.lineTotalPaise, 0);
}

function assertCouponUsable(coupon: ShopCoupon, now: Date, alreadyRedeemed: boolean): void {
  if (!coupon.active) throw new AppError(400, "This coupon is no longer active.", "COUPON_INACTIVE");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    throw new AppError(400, "This coupon has expired.", "COUPON_EXPIRED");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError(400, "This coupon has reached its usage limit.", "COUPON_MAXED");
  }
  if (alreadyRedeemed) {
    throw new AppError(400, "You've already used this coupon.", "COUPON_ALREADY_USED");
  }
}

function toView(
  coupon: ShopCoupon & {
    product?: { name: string } | null;
    variant?: { name: string } | null;
  },
): ShopCouponView {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    scope: coupon.productId ? "product" : "cart",
    productId: coupon.productId,
    productName: coupon.product?.name ?? null,
    variantId: coupon.variantId,
    variantName: coupon.variant?.name ?? null,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    active: coupon.active,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export class ShopCouponService {
  private async openShop(websiteId: string, actor: AuthUser) {
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
      throw new AppError(403, "Turn the shop on before managing coupons.", "SHOP_OFF");
    }
    return website;
  }

  private async resolveScope(
    websiteId: string,
    productId: string | null | undefined,
    variantId: string | null | undefined,
  ): Promise<{ productId: string | null; variantId: string | null }> {
    const pid = productId?.trim() || null;
    const vid = variantId?.trim() || null;
    if (!pid) {
      if (vid) throw new AppError(400, "Pick a product before choosing a variant.", "PRODUCT_REQUIRED");
      return { productId: null, variantId: null };
    }
    const product = await prisma.product.findFirst({
      where: { id: pid, websiteId },
      select: { id: true },
    });
    if (!product) throw new AppError(400, "That product isn't in this shop.", "PRODUCT_NOT_FOUND");
    if (!vid) return { productId: pid, variantId: null };
    const variant = await prisma.productVariant.findFirst({
      where: { id: vid, productId: pid },
      select: { id: true },
    });
    if (!variant) throw new AppError(400, "That variant isn't on this product.", "VARIANT_NOT_FOUND");
    return { productId: pid, variantId: vid };
  }

  async list(websiteId: string, actor: AuthUser): Promise<ShopCouponView[]> {
    await this.openShop(websiteId, actor);
    const rows = await prisma.shopCoupon.findMany({
      where: { websiteId },
      include: { product: { select: { name: true } }, variant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toView);
  }

  /**
   * Active, unexpired coupons a shopper can use for this product:
   * whole-cart codes plus codes scoped to the product (any or a specific variant).
   */
  async listPublicForProduct(websiteId: string, productId: string): Promise<PublicShopCoupon[]> {
    const now = new Date();
    const rows = await prisma.shopCoupon.findMany({
      where: {
        websiteId,
        active: true,
        OR: [{ productId: null }, { productId }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      include: { variant: { select: { name: true } } },
      orderBy: [{ productId: "asc" }, { createdAt: "desc" }],
      take: 80,
    });

    return rows
      .filter((row) => row.maxUses === null || row.usedCount < row.maxUses)
      .slice(0, 40)
      .map((row) => ({
        code: row.code,
        discountType: row.discountType,
        discountValue: row.discountValue,
        scope: row.productId ? ("product" as const) : ("cart" as const),
        variantId: row.variantId,
        variantName: row.variant?.name ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
      }));
  }

  async create(websiteId: string, input: CreateShopCouponInput, actor: AuthUser): Promise<ShopCouponView> {
    const website = await this.openShop(websiteId, actor);
    const code = normalizeCode(input.code);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new AppError(400, "Use 3–40 letters, numbers, hyphens or underscores.", "INVALID_COUPON_CODE");
    }
    assertDiscountInput(input.discountType, input.discountValue);
    if (input.maxUses !== null && input.maxUses !== undefined && input.maxUses < 1) {
      throw new AppError(400, "Max uses must be at least 1, or leave it unlimited.", "INVALID_MAX_USES");
    }
    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw new AppError(400, "Invalid expiry date.", "INVALID_EXPIRY");
      if (expiresAt.getTime() <= Date.now()) throw new AppError(400, "Expiry must be in the future.", "INVALID_EXPIRY");
    }
    const scope = await this.resolveScope(websiteId, input.productId, input.variantId);

    try {
      const row = await prisma.shopCoupon.create({
        data: {
          id: randomUUID(),
          websiteId,
          clientId: website.clientId,
          code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          productId: scope.productId,
          variantId: scope.variantId,
          expiresAt,
          maxUses: input.maxUses ?? null,
        },
        include: { product: { select: { name: true } }, variant: { select: { name: true } } },
      });
      purgeShopPages(websiteId);
      return toView(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "That coupon code already exists on this shop.", "COUPON_EXISTS");
      }
      throw error;
    }
  }

  async update(
    websiteId: string,
    couponId: string,
    input: UpdateShopCouponInput,
    actor: AuthUser,
  ): Promise<ShopCouponView> {
    await this.openShop(websiteId, actor);
    const existing = await prisma.shopCoupon.findFirst({ where: { id: couponId, websiteId } });
    if (!existing) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const discountType = input.discountType ?? existing.discountType;
    const discountValue = input.discountValue ?? existing.discountValue;
    assertDiscountInput(discountType, discountValue);

    if (input.maxUses !== undefined && input.maxUses !== null && input.maxUses < 1) {
      throw new AppError(400, "Max uses must be at least 1, or leave it unlimited.", "INVALID_MAX_USES");
    }

    let expiresAt: Date | null | undefined = undefined;
    if (input.expiresAt !== undefined) {
      if (!input.expiresAt) expiresAt = null;
      else {
        const parsed = new Date(input.expiresAt);
        if (Number.isNaN(parsed.getTime())) throw new AppError(400, "Invalid expiry date.", "INVALID_EXPIRY");
        expiresAt = parsed;
      }
    }

    const nextProductId = input.productId !== undefined ? input.productId : existing.productId;
    const nextVariantId = input.variantId !== undefined ? input.variantId : existing.variantId;
    const scope =
      input.productId !== undefined || input.variantId !== undefined
        ? await this.resolveScope(websiteId, nextProductId, nextVariantId)
        : { productId: existing.productId, variantId: existing.variantId };

    const row = await prisma.shopCoupon.update({
      where: { id: existing.id },
      data: {
        discountType,
        discountValue,
        productId: scope.productId,
        variantId: scope.variantId,
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { product: { select: { name: true } }, variant: { select: { name: true } } },
    });
    purgeShopPages(websiteId);
    return toView(row);
  }

  /** Orders that successfully redeemed this coupon (paid checkouts). */
  async listRedemptions(
    websiteId: string,
    couponId: string,
    actor: AuthUser,
  ): Promise<ShopCouponRedemptionView[]> {
    await this.openShop(websiteId, actor);
    const coupon = await prisma.shopCoupon.findFirst({
      where: { id: couponId, websiteId },
      select: { id: true },
    });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const rows = await prisma.shopCouponRedemption.findMany({
      where: { couponId, websiteId },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { id: true, number: true, status: true } },
        customer: { select: { id: true, fullName: true, email: true, isGuest: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      listAmountPaise: row.listAmountPaise,
      discountPaise: row.discountPaise,
      finalAmountPaise: row.finalAmountPaise,
      createdAt: row.createdAt.toISOString(),
      order: {
        id: row.order.id,
        number: String(row.order.number),
        status: String(row.order.status).toLowerCase(),
      },
      customer: {
        id: row.customer.id,
        fullName: row.customer.fullName,
        email: row.customer.email,
        isGuest: row.customer.isGuest,
      },
    }));
  }

  /**
   * Validates a code against cart lines for this customer; does not consume a use.
   * Discount is taken only from eligible lines (whole cart or matching product/variant).
   */
  async quote(params: {
    websiteId: string;
    customerId: string;
    code: string | undefined | null;
    lines: CartLine[];
    now?: Date;
  }): Promise<AppliedShopCoupon | null> {
    const normalized = params.code ? normalizeCode(params.code) : "";
    if (!normalized) return null;

    const listAmountPaise = params.lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
    const coupon = await prisma.shopCoupon.findUnique({
      where: { websiteId_code: { websiteId: params.websiteId, code: normalized } },
    });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const redeemed = await prisma.shopCouponRedemption.findUnique({
      where: { couponId_customerId: { couponId: coupon.id, customerId: params.customerId } },
      select: { id: true },
    });
    assertCouponUsable(coupon, params.now ?? new Date(), Boolean(redeemed));

    const eligiblePaise = eligiblePaiseFor(params.lines, coupon);
    if (eligiblePaise <= 0) {
      throw new AppError(
        400,
        coupon.productId
          ? "Add the discounted product to your cart to use this coupon."
          : "This coupon can't be applied to an empty cart.",
        "COUPON_NOT_APPLICABLE",
      );
    }

    const discountPaise = discountPaiseFor(eligiblePaise, coupon);
    return {
      couponId: coupon.id,
      code: coupon.code,
      listAmountPaise,
      eligiblePaise,
      discountPaise,
      finalAmountPaise: Math.max(0, listAmountPaise - discountPaise),
    };
  }

  async previewForCustomer(
    websiteId: string,
    customerId: string,
    couponCode: string,
  ): Promise<ShopCouponPreview> {
    const cart = await prisma.shopCartItem.findMany({
      where: { websiteId, customerId },
      include: {
        product: {
          select: {
            id: true,
            gstPercent: true,
            priceIncludesGst: true,
            website: { select: { shopGstPercent: true, shopPriceIncludesGst: true } },
          },
        },
        variant: { select: { id: true, pricePaise: true } },
      },
    });
    if (cart.length === 0) throw new AppError(400, "Your cart is empty.", "CART_EMPTY");

    const { effectiveGst, payableUnitPaise } = await import("../utils/shop-gst.js");
    const lines = cart.map((line) => {
      const gst = effectiveGst(line.product, line.product.website);
      return {
        productId: line.productId,
        variantId: line.variantId,
        lineTotalPaise: payableUnitPaise(line.variant.pricePaise, gst) * line.quantity,
      };
    });

    const applied = await this.quote({ websiteId, customerId, code: couponCode, lines });
    if (!applied) throw new AppError(400, "Enter a coupon code.", "COUPON_REQUIRED");
    const coupon = await prisma.shopCoupon.findUnique({ where: { id: applied.couponId } });
    return {
      code: applied.code,
      listAmountPaise: applied.listAmountPaise,
      discountPaise: applied.discountPaise,
      finalAmountPaise: applied.finalAmountPaise,
      scope: coupon?.productId ? "product" : "cart",
    };
  }

  /** Records redemption after payment; safe once per order / customer. */
  async redeemInTransaction(
    tx: Tx,
    params: {
      couponId: string;
      websiteId: string;
      customerId: string;
      shopOrderId: string;
      listAmountPaise: number;
      discountPaise: number;
      finalAmountPaise: number;
      now?: Date;
    },
  ): Promise<void> {
    const now = params.now ?? new Date();
    const coupon = await tx.shopCoupon.findUnique({ where: { id: params.couponId } });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const existingOrder = await tx.shopCouponRedemption.findUnique({
      where: { shopOrderId: params.shopOrderId },
      select: { id: true },
    });
    if (existingOrder) return;

    const redeemed = await tx.shopCouponRedemption.findUnique({
      where: { couponId_customerId: { couponId: coupon.id, customerId: params.customerId } },
      select: { id: true },
    });
    assertCouponUsable(coupon, now, Boolean(redeemed));

    const claimed = await tx.shopCoupon.updateMany({
      where: {
        id: coupon.id,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new AppError(400, "This coupon has reached its usage limit.", "COUPON_MAXED");
    }

    await tx.shopCouponRedemption.create({
      data: {
        id: randomUUID(),
        couponId: params.couponId,
        websiteId: params.websiteId,
        customerId: params.customerId,
        shopOrderId: params.shopOrderId,
        listAmountPaise: params.listAmountPaise,
        discountPaise: params.discountPaise,
        finalAmountPaise: params.finalAmountPaise,
      },
    });
  }
}

// tiny alias so create() can call assertDiscountInput without `this.`
function assertDiscountInput(discountType: ShopCouponDiscountTypeLabel, discountValue: number): void {
  if (discountType === "PERCENT") {
    if (!Number.isInteger(discountValue) || discountValue < 1 || discountValue > 100) {
      throw new AppError(400, "Percent must be a whole number from 1 to 100.", "INVALID_DISCOUNT");
    }
    return;
  }
  if (!Number.isInteger(discountValue) || discountValue < 1) {
    throw new AppError(400, "Fixed discount must be at least ₹0.01.", "INVALID_DISCOUNT");
  }
}

export const shopCouponService = new ShopCouponService();
