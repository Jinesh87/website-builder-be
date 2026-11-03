import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, ShopOrderStatus, ShopRefundStatus } from "../../../generated/prisma/client.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { purgeShopPages } from "./shop-cache.js";
import { refundStatusLabel, shopCheckoutService } from "./shop-checkout.service.js";
import type { ShopRefundStatusLabel } from "../types/shop-auth.types.js";
import { recordOrderStatusEvent, toTimelineEvent, type ShopOrderTimelineEvent } from "../utils/shop-order-timeline.js";
import { shopOrderEmailsService } from "./shop-order-emails.service.js";
import { logger } from "../../../config/logger.js";

const PAGE_SIZE = 20;

export type ShopOrderStatusLabel =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled"
  | "returned";

export type ShopOrderItemView = {
  id: string;
  productName: string;
  variantName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type ShopOrderView = {
  id: string;
  number: string;
  status: ShopOrderStatusLabel;
  refundStatus: ShopRefundStatusLabel;
  totalPaise: number;
  currency: "INR";
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  items: ShopOrderItemView[];
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  cancelReason: string | null;
  returnReason: string | null;
  shippingAddress: {
    label: string | null;
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  timeline: ShopOrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ShopOrderPage = {
  orders: ShopOrderView[];
  page: number;
  pageSize: number;
  total: number;
};

export type ShopOrderQuery = {
  search?: string;
  status?: ShopOrderStatusLabel;
  page?: number;
};

const STATUS_FROM_LABEL: Record<ShopOrderStatusLabel, ShopOrderStatus> = {
  pending: ShopOrderStatus.PENDING,
  paid: ShopOrderStatus.PAID,
  processing: ShopOrderStatus.PROCESSING,
  shipped: ShopOrderStatus.SHIPPED,
  delivered: ShopOrderStatus.DELIVERED,
  failed: ShopOrderStatus.FAILED,
  cancelled: ShopOrderStatus.CANCELLED,
  returned: ShopOrderStatus.RETURNED,
};

const LABEL_FROM_STATUS: Record<ShopOrderStatus, ShopOrderStatusLabel> = {
  [ShopOrderStatus.PENDING]: "pending",
  [ShopOrderStatus.PAID]: "paid",
  [ShopOrderStatus.PROCESSING]: "processing",
  [ShopOrderStatus.SHIPPED]: "shipped",
  [ShopOrderStatus.DELIVERED]: "delivered",
  [ShopOrderStatus.FAILED]: "failed",
  [ShopOrderStatus.CANCELLED]: "cancelled",
  [ShopOrderStatus.RETURNED]: "returned",
};

function parseShippingAddress(value: Prisma.JsonValue | null | undefined): ShopOrderView["shippingAddress"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : "");
  const fullName = text("fullName");
  const line1 = text("line1");
  const city = text("city");
  if (!fullName || !line1 || !city) return null;
  return {
    label: typeof row.label === "string" ? row.label : null,
    fullName,
    phone: text("phone"),
    line1,
    line2: typeof row.line2 === "string" ? row.line2 : null,
    city,
    state: text("state"),
    postalCode: text("postalCode"),
    country: text("country") || "IN",
  };
}

function toView(order: {
  id: string;
  number: number;
  status: ShopOrderStatus;
  refundStatus: ShopRefundStatus;
  totalPaise: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  failureReason: string | null;
  cancelReason: string | null;
  returnReason: string | null;
  shippingAddress?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; fullName: string; email: string; phone: string | null };
  items: {
    id: string;
    productName: string;
    variantName: string;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }[];
  events?: {
    id: string;
    status: ShopOrderStatus;
    actorType: string;
    note: string | null;
    createdAt: Date;
  }[];
}): ShopOrderView {
  return {
    id: order.id,
    number: String(order.number),
    status: LABEL_FROM_STATUS[order.status],
    refundStatus: refundStatusLabel(order.refundStatus),
    totalPaise: order.totalPaise,
    currency: "INR",
    customer: order.customer,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise: item.lineTotalPaise,
    })),
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    razorpayRefundId: order.razorpayRefundId,
    paidAt: order.paidAt?.toISOString() ?? null,
    refundedAt: order.refundedAt?.toISOString() ?? null,
    failureReason: order.failureReason,
    cancelReason: order.cancelReason,
    returnReason: order.returnReason,
    shippingAddress: parseShippingAddress(order.shippingAddress),
    timeline: (order.events ?? []).map(toTimelineEvent),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export class ShopOrdersService {
  private async openShop(websiteId: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: { id: true, shopEnabled: true, client: { select: { shopFeatureEnabled: true } } },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before managing orders.", "SHOP_OFF");
    }
    return website;
  }

  async list(websiteId: string, query: ShopOrderQuery, actor: AuthUser): Promise<ShopOrderPage> {
    await this.openShop(websiteId, actor);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const search = query.search?.trim();
    const status = query.status ? STATUS_FROM_LABEL[query.status] : undefined;

    const where = {
      websiteId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              ...( /^\d+$/.test(search) ? [{ number: Number(search) }] : []),
              { customer: { fullName: { contains: search, mode: "insensitive" as const } } },
              { customer: { email: { contains: search, mode: "insensitive" as const } } },
              { razorpayPaymentId: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.shopOrder.count({ where }),
      prisma.shopOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
          items: { orderBy: { productName: "asc" } },
          events: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return { orders: rows.map(toView), page, pageSize: PAGE_SIZE, total };
  }

  async get(websiteId: string, orderId: string, actor: AuthUser): Promise<ShopOrderView> {
    await this.openShop(websiteId, actor);
    const order = await prisma.shopOrder.findFirst({
      where: { id: orderId, websiteId },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        items: { orderBy: { productName: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");
    return toView(order);
  }

  /**
   * Client fulfillment status updates. Moving into `paid` (or any paid-or-later status)
   * deducts stock once if payment never finished that step.
   */
  async updateStatus(
    websiteId: string,
    orderId: string,
    status: ShopOrderStatusLabel,
    actor: AuthUser,
  ): Promise<ShopOrderView> {
    await this.openShop(websiteId, actor);
    const nextStatus = STATUS_FROM_LABEL[status];
    const existing = await prisma.shopOrder.findFirst({
      where: { id: orderId, websiteId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");

    const shouldDeduct =
      !existing.stockDeductedAt &&
      (nextStatus === ShopOrderStatus.PAID ||
        nextStatus === ShopOrderStatus.PROCESSING ||
        nextStatus === ShopOrderStatus.SHIPPED ||
        nextStatus === ShopOrderStatus.DELIVERED);

    let stockChanged = false;
    await prisma.$transaction(async (tx) => {
      if (shouldDeduct) {
        for (const item of existing.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findFirst({
            where: { id: item.variantId, product: { websiteId } },
            select: {
              id: true,
              name: true,
              product: { select: { id: true, name: true } },
            },
          });
          if (!variant) {
            throw new AppError(400, `${item.productName} is no longer available.`, "VARIANT_NOT_FOUND");
          }
          const claimed = await tx.productVariant.updateMany({
            where: { id: variant.id, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (claimed.count === 0) {
            throw new AppError(400, `Not enough stock for ${item.productName}.`, "INSUFFICIENT_STOCK");
          }
          const after = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { quantity: true } });
          await tx.inventoryMovement.create({
            data: {
              websiteId: existing.websiteId,
              clientId: existing.clientId,
              productId: variant.product.id,
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              delta: -item.quantity,
              quantityAfter: after?.quantity ?? 0,
              note: `Order #${existing.number}`,
              userId: actor.id,
            },
          });
        }
        stockChanged = true;
      }

      if (existing.status !== nextStatus) {
        await tx.shopOrder.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            ...(shouldDeduct ? { stockDeductedAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.PAID && !existing.paidAt ? { paidAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.FAILED || nextStatus === ShopOrderStatus.CANCELLED
              ? {}
              : { failureReason: null }),
          },
        });
        await recordOrderStatusEvent(tx, {
          orderId: existing.id,
          status: nextStatus,
          actorType: "CLIENT",
          note: `Status set to ${LABEL_FROM_STATUS[nextStatus]}`,
          userId: actor.id,
        });
      } else if (shouldDeduct) {
        await tx.shopOrder.update({
          where: { id: existing.id },
          data: {
            ...(shouldDeduct ? { stockDeductedAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.PAID && !existing.paidAt ? { paidAt: new Date() } : {}),
          },
        });
      }
    });

    if (stockChanged) purgeShopPages(websiteId);
    if (existing.status !== nextStatus) {
      void shopOrderEmailsService.notifyStatusChange(orderId, nextStatus);
    }
    return this.get(websiteId, orderId, actor);
  }

  /**
   * Merchant retries a Razorpay refund for a returned order whose automatic refund failed.
   */
  async retryRefund(websiteId: string, orderId: string, actor: AuthUser): Promise<ShopOrderView> {
    await this.openShop(websiteId, actor);
    const existing = await prisma.shopOrder.findFirst({
      where: { id: orderId, websiteId },
      select: {
        id: true,
        status: true,
        refundStatus: true,
        razorpayPaymentId: true,
        returnReason: true,
        failureReason: true,
        number: true,
      },
    });
    if (!existing) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");
    if (existing.status !== ShopOrderStatus.RETURNED) {
      throw new AppError(400, "Only returned orders can use this refund action.", "REFUND_NOT_ALLOWED");
    }
    if (existing.refundStatus !== ShopRefundStatus.FAILED) {
      throw new AppError(400, "This order does not have a failed refund to retry.", "REFUND_NOT_FAILED");
    }
    if (!existing.razorpayPaymentId) {
      throw new AppError(400, "This order has no payment to refund.", "PAYMENT_MISSING");
    }

    const reason = (existing.returnReason || existing.failureReason || "Merchant refund retry").slice(0, 500);
    const refund = await shopCheckoutService.refundCapturedPayment(
      websiteId,
      existing.id,
      existing.razorpayPaymentId,
      reason,
      "shop_merchant_return_refund",
    );

    if (refund.ok) {
      const note =
        refund.refundStatus === ShopRefundStatus.PROCESSED
          ? "Refund processed by store"
          : "Refund restarted by store";
      await prisma.shopOrder.update({
        where: { id: existing.id },
        data: {
          failureReason: `${note}. ${reason}`.slice(0, 300),
        },
      });
      await recordOrderStatusEvent(prisma, {
        orderId: existing.id,
        status: ShopOrderStatus.RETURNED,
        actorType: "CLIENT",
        note,
        userId: actor.id,
      });
      logger.info(
        { websiteId, orderId: existing.id, number: existing.number, refundStatus: refund.refundStatus },
        "Merchant retried return refund",
      );
    } else {
      throw new AppError(
        502,
        "Razorpay could not process the refund. Check your payment keys or try again.",
        "REFUND_RETRY_FAILED",
      );
    }

    return this.get(websiteId, orderId, actor);
  }
}

export const shopOrdersService = new ShopOrdersService();
