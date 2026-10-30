import { AppError } from "../../../common/errors/AppError.js";
import { UserStatus } from "../../../common/constants/roles.js";
import { decryptSecret } from "../../../common/utils/secret-box.js";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { Prisma, ShopOrderStatus, ShopRefundStatus, type ShopOrder } from "../../../generated/prisma/client.js";
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
  isValidPaymentSignature,
} from "../../wallet/services/razorpay.client.js";
import { PAYMENT_CURRENCY, type RazorpayWebhookEvent } from "../../wallet/services/wallet.service.js";
import { purgeShopPages } from "./shop-cache.js";
import type {
  ShopCancelOrderInput,
  ShopOrderDetailView,
  ShopOrderSummary,
  ShopRefundStatusLabel,
} from "../types/shop-auth.types.js";
import { canCustomerCancelOrder, cancelUntilLabel } from "../utils/shop-order-cancel.js";
import { getReservedQty, releaseStockForOrder, reserveStockForOrder } from "../utils/shop-stock-hold.js";
import { recordOrderStatusEvent, toTimelineEvent, type ShopOrderTimelineEvent } from "../utils/shop-order-timeline.js";
import { shopOrderEmailsService } from "./shop-order-emails.service.js";

const FIRST_ORDER_NUMBER = 1001;

export type ShopCheckoutSession = {
  orderId: string;
  orderNumber: string;
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  businessName: string;
  prefill: { name: string; email?: string; contact?: string };
};

export type ShopCheckoutConfirmation = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

function statusLabel(status: ShopOrderStatus): ShopOrderSummary["status"] {
  switch (status) {
    case ShopOrderStatus.PENDING:
      return "pending";
    case ShopOrderStatus.PAID:
      return "paid";
    case ShopOrderStatus.PROCESSING:
      return "processing";
    case ShopOrderStatus.SHIPPED:
      return "shipped";
    case ShopOrderStatus.DELIVERED:
      return "delivered";
    case ShopOrderStatus.FAILED:
      return "failed";
    case ShopOrderStatus.CANCELLED:
      return "cancelled";
    default:
      return "pending";
  }
}

export function refundStatusLabel(status: ShopRefundStatus): ShopRefundStatusLabel {
  switch (status) {
    case ShopRefundStatus.PENDING:
      return "pending";
    case ShopRefundStatus.PROCESSED:
      return "processed";
    case ShopRefundStatus.FAILED:
      return "failed";
    default:
      return "none";
  }
}

function refundStatusFromRazorpay(status: string | undefined): ShopRefundStatus {
  if (status === "processed") return ShopRefundStatus.PROCESSED;
  if (status === "failed") return ShopRefundStatus.FAILED;
  return ShopRefundStatus.PENDING;
}

export function toOrderSummary(
  order: Pick<
    ShopOrder,
    "id" | "number" | "status" | "refundStatus" | "totalPaise" | "currency" | "createdAt" | "refundedAt"
  >,
  cancelUntilStatus?: ShopOrderStatus | null,
): ShopOrderSummary {
  return {
    id: order.id,
    number: String(order.number),
    status: statusLabel(order.status),
    refundStatus: refundStatusLabel(order.refundStatus),
    totalPaise: order.totalPaise,
    currency: "INR",
    createdAt: order.createdAt.toISOString(),
    refundedAt: order.refundedAt?.toISOString() ?? null,
    canCancel: canCustomerCancelOrder(order.status, cancelUntilStatus ?? null),
  };
}

/** Puts deducted units back on the shelf once when a paid order is cancelled. */
async function restoreStockOnce(tx: Prisma.TransactionClient, orderId: string): Promise<boolean> {
  const order = await tx.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order?.stockDeductedAt) return false;

  for (const item of order.items) {
    if (!item.variantId) continue;
    const variant = await tx.productVariant.findFirst({
      where: { id: item.variantId, product: { websiteId: order.websiteId } },
      select: {
        id: true,
        name: true,
        product: { select: { id: true, name: true } },
      },
    });
    if (!variant) continue;

    const updated = await tx.productVariant.update({
      where: { id: variant.id },
      data: { quantity: { increment: item.quantity } },
      select: { quantity: true },
    });
    await tx.inventoryMovement.create({
      data: {
        websiteId: order.websiteId,
        clientId: order.clientId,
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        delta: item.quantity,
        quantityAfter: updated.quantity,
        note: `Order #${order.number} cancelled`,
        userId: null,
      },
    });
  }

  const cleared = await tx.shopOrder.updateMany({
    where: { id: order.id, stockDeductedAt: { not: null } },
    data: { stockDeductedAt: null },
  });
  return cleared.count > 0;
}

async function shopPaymentKeys(websiteId: string): Promise<{ keyId: string; keySecret: string } | null> {
  const config = await prisma.shopPaymentConfig.findUnique({
    where: { websiteId },
    select: { razorpayKeyId: true, razorpayKeySecretCipher: true },
  });
  if (!config?.razorpayKeyId || !config.razorpayKeySecretCipher) return null;
  const keySecret = decryptSecret(config.razorpayKeySecretCipher);
  if (!keySecret) return null;
  return { keyId: config.razorpayKeyId, keySecret };
}

/**
 * Deducts stock for each line once using an atomic DB check (`quantity >= need`).
 * Throws INSUFFICIENT_STOCK / VARIANT_NOT_FOUND when a line cannot be taken — caller may refund.
 */
async function deductStockOnce(tx: Prisma.TransactionClient, orderId: string): Promise<boolean> {
  const order = await tx.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.stockDeductedAt) return false;

  for (const item of order.items) {
    if (!item.variantId) continue;
    const variant = await tx.productVariant.findFirst({
      where: { id: item.variantId, product: { websiteId: order.websiteId } },
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
        websiteId: order.websiteId,
        clientId: order.clientId,
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        delta: -item.quantity,
        quantityAfter: after?.quantity ?? 0,
        note: `Order #${order.number}`,
        userId: null,
      },
    });
  }

  const marked = await tx.shopOrder.updateMany({
    where: { id: order.id, stockDeductedAt: null },
    data: { stockDeductedAt: new Date() },
  });
  return marked.count > 0;
}

function isStockFailure(error: unknown): error is AppError {
  return error instanceof AppError && (error.code === "INSUFFICIENT_STOCK" || error.code === "VARIANT_NOT_FOUND");
}

export class ShopCheckoutService {
  async listCustomerOrders(websiteId: string, customerId: string): Promise<ShopOrderSummary[]> {
    const [rows, website] = await Promise.all([
      prisma.shopOrder.findMany({
        where: { websiteId, customerId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { shopCancelUntilStatus: true },
      }),
    ]);
    const cancelUntil = website?.shopCancelUntilStatus ?? null;
    return rows.map((row) => toOrderSummary(row, cancelUntil));
  }

  async getCancelUntilStatus(websiteId: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { shopCancelUntilStatus: true },
    });
    return cancelUntilLabel(website?.shopCancelUntilStatus ?? null);
  }

  /** Builds a PENDING order from the cart and a matching Razorpay order for Checkout. */
  async startCheckout(websiteId: string, customerId: string): Promise<ShopCheckoutSession> {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
      select: {
        id: true,
        clientId: true,
        email: true,
        fullName: true,
        phone: true,
        website: { select: { id: true, name: true, shopEnabled: true, client: { select: { shopFeatureEnabled: true } } } },
      },
    });
    if (!customer) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    if (!customer.website.shopEnabled || !customer.website.client.shopFeatureEnabled) {
      throw new AppError(404, "Shop is not available on this website.", "SHOP_DISABLED");
    }

    const keys = await shopPaymentKeys(websiteId);
    if (!keys) {
      throw new AppError(400, "This shop isn't set up to take payments yet.", "PAYMENTS_NOT_CONFIGURED");
    }

    const cart = await prisma.shopCartItem.findMany({
      where: { websiteId, customerId: customer.id },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, pricePaise: true, quantity: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (cart.length === 0) throw new AppError(400, "Your cart is empty.", "CART_EMPTY");

    const onHandByVariant = new Map<string, number>();
    for (const line of cart) {
      onHandByVariant.set(line.variantId, line.variant.quantity);
      if (line.variant.quantity <= 0) {
        throw new AppError(400, `${line.product.name} is out of stock.`, "OUT_OF_STOCK");
      }
      const reserved = await getReservedQty(websiteId, line.variantId);
      const available = line.variant.quantity - reserved;
      if (available <= 0) {
        throw new AppError(400, `${line.product.name} is being purchased by someone else. Try again shortly.`, "STOCK_HELD");
      }
      if (line.quantity > available) {
        throw new AppError(
          400,
          available === 1
            ? `Only 1 left of ${line.product.name} (others are checking out).`
            : `Only ${available} left of ${line.product.name} (others are checking out).`,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    const totalPaise = cart.reduce((sum, line) => sum + line.variant.pricePaise * line.quantity, 0);
    if (totalPaise < 100) {
      throw new AppError(400, "Order total must be at least ₹1.", "AMOUNT_TOO_LOW");
    }

    const previousPending = await prisma.shopOrder.findMany({
      where: { websiteId, customerId: customer.id, status: ShopOrderStatus.PENDING },
      select: { id: true, items: { select: { variantId: true } } },
    });
    for (const previous of previousPending) {
      await releaseStockForOrder(websiteId, previous.id, previous.items);
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.shopOrder.updateMany({
        where: { websiteId, customerId: customer.id, status: ShopOrderStatus.PENDING },
        data: { status: ShopOrderStatus.CANCELLED, failureReason: "Replaced by a new checkout" },
      });

      const latest = await tx.shopOrder.findFirst({
        where: { websiteId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (latest?.number ?? FIRST_ORDER_NUMBER - 1) + 1;

      return tx.shopOrder.create({
        data: {
          websiteId,
          clientId: customer.clientId,
          customerId: customer.id,
          number,
          status: ShopOrderStatus.PENDING,
          currency: PAYMENT_CURRENCY,
          totalPaise,
          items: {
            create: cart.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productName: line.product.name,
              variantName: line.variant.name,
              unitPricePaise: line.variant.pricePaise,
              quantity: line.quantity,
              lineTotalPaise: line.variant.pricePaise * line.quantity,
            })),
          },
          events: {
            create: { status: ShopOrderStatus.PENDING, actorType: "SYSTEM", note: "Order placed — awaiting payment" },
          },
        },
        include: { items: { select: { variantId: true, quantity: true, productName: true } } },
      });
    });

    let hold;
    try {
      hold = await reserveStockForOrder(
        websiteId,
        order.id,
        order.items
          .filter((item) => item.variantId)
          .map((item) => ({
            variantId: item.variantId!,
            quantity: item.quantity,
            productName: item.productName,
          })),
        onHandByVariant,
      );
    } catch {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: ShopOrderStatus.FAILED, failureReason: "Could not reserve stock" },
      });
      throw new AppError(503, "Checkout is temporarily unavailable. Please try again.", "STOCK_HOLD_UNAVAILABLE");
    }
    if (!hold.ok) {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: ShopOrderStatus.CANCELLED, failureReason: "Stock held by another checkout" },
      });
      throw new AppError(
        400,
        `${hold.productName} is being purchased by someone else. Try again shortly.`,
        "STOCK_HELD",
      );
    }

    let razorpay;
    try {
      razorpay = await createRazorpayOrder(keys, {
        amountPaise: totalPaise,
        currency: PAYMENT_CURRENCY,
        receipt: `shop_${order.id.replace(/-/g, "").slice(0, 32)}`,
        notes: {
          purpose: "shop_order",
          websiteId,
          shopOrderId: order.id,
          customerId: customer.id,
        },
      });
    } catch (error) {
      await releaseStockForOrder(websiteId, order.id, order.items);
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: ShopOrderStatus.FAILED, failureReason: "Could not create Razorpay order" },
      });
      throw error;
    }

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpay.id },
    });

    // Razorpay Checkout expects digits only (no spaces / dashes); bad contact often 400s validate/account.
    const contact = customer.phone?.replace(/\D/g, "") || undefined;

    return {
      orderId: order.id,
      orderNumber: String(order.number),
      keyId: keys.keyId,
      razorpayOrderId: razorpay.id,
      amountPaise: totalPaise,
      currency: PAYMENT_CURRENCY,
      businessName: customer.website.name,
      prefill: {
        name: customer.fullName,
        email: customer.email,
        ...(contact ? { contact } : {}),
      },
    };
  }

  /** Browser callback after Razorpay Checkout succeeds. Webhook is the backup. */
  async confirmCheckout(
    websiteId: string,
    customerId: string,
    input: ShopCheckoutConfirmation,
  ): Promise<ShopOrderSummary> {
    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, customerId, razorpayOrderId: input.razorpayOrderId },
    });
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");

    const keys = await shopPaymentKeys(websiteId);
    if (!keys) throw new AppError(400, "This shop isn't set up to take payments yet.", "PAYMENTS_NOT_CONFIGURED");

    if (!isValidPaymentSignature(keys.keySecret, input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      throw new AppError(
        400,
        "We couldn't verify this payment. If money was taken, your order will update automatically.",
        "PAYMENT_VERIFICATION_FAILED",
      );
    }

    let payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.totalPaise || payment.currency !== order.currency) {
      throw new AppError(400, "This payment doesn't match the order.", "PAYMENT_VERIFICATION_FAILED");
    }
    if (payment.status === "authorized") {
      payment = await captureRazorpayPayment(keys, payment.id, order.totalPaise, order.currency);
    }
    if (payment.status !== "captured") {
      throw new AppError(400, "The payment hasn't completed yet. Your order updates as soon as it does.", "PAYMENT_PENDING");
    }

    const paid = await this.markPaid(order.id, payment.id);
    return toOrderSummary(paid);
  }

  /**
   * Full refund after a captured payment when we cannot fulfil (e.g. stock raced away).
   * Records refundStatus immediately; refund.processed webhook confirms money landed.
   */
  private async refundCapturedPayment(
    websiteId: string,
    orderId: string,
    razorpayPaymentId: string,
    reason: string,
    purpose = "shop_stock_unavailable",
  ): Promise<{ ok: boolean; refundStatus: ShopRefundStatus }> {
    const keys = await shopPaymentKeys(websiteId);
    if (!keys) {
      logger.error({ websiteId, orderId, razorpayPaymentId }, "Shop refund skipped: payment keys missing");
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: { razorpayPaymentId, refundStatus: ShopRefundStatus.FAILED },
      });
      return { ok: false, refundStatus: ShopRefundStatus.FAILED };
    }
    try {
      const refund = await createRazorpayRefund(keys, razorpayPaymentId, {
        notes: { purpose, shopOrderId: orderId, reason: reason.slice(0, 100) },
        receipt: `shop_rfnd_${orderId.replace(/-/g, "").slice(0, 28)}`,
      });
      const refundStatus = refundStatusFromRazorpay(refund.status);
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
          razorpayPaymentId,
          razorpayRefundId: refund.id,
          refundStatus,
          ...(refundStatus === ShopRefundStatus.PROCESSED ? { refundedAt: new Date() } : { refundedAt: null }),
        },
      });
      return { ok: true, refundStatus };
    } catch (error) {
      logger.error({ err: error, websiteId, orderId, razorpayPaymentId }, "Shop Razorpay refund failed");
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: { razorpayPaymentId, refundStatus: ShopRefundStatus.FAILED },
      });
      return { ok: false, refundStatus: ShopRefundStatus.FAILED };
    }
  }

  /**
   * Marks the order paid, deducts stock once (atomic DB check), and clears matching cart lines.
   * If stock is gone after payment, refunds via Razorpay and marks the order failed.
   */
  async markPaid(orderId: string, razorpayPaymentId: string): Promise<ShopOrder> {
    const existing = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");

    if (
      existing.status === ShopOrderStatus.PAID ||
      existing.status === ShopOrderStatus.PROCESSING ||
      existing.status === ShopOrderStatus.SHIPPED ||
      existing.status === ShopOrderStatus.DELIVERED
    ) {
      if (!existing.stockDeductedAt) {
        await prisma.$transaction((tx) => deductStockOnce(tx, existing.id));
        purgeShopPages(existing.websiteId);
      }
      await releaseStockForOrder(existing.websiteId, existing.id, existing.items);
      return existing;
    }

    if (existing.status === ShopOrderStatus.FAILED) {
      await releaseStockForOrder(existing.websiteId, existing.id, existing.items);
      return existing;
    }

    if (existing.status === ShopOrderStatus.CANCELLED) {
      const refund = await this.refundCapturedPayment(
        existing.websiteId,
        existing.id,
        razorpayPaymentId,
        "Order was cancelled before fulfilment",
      );
      await prisma.shopOrder.update({
        where: { id: existing.id },
        data: {
          failureReason: refund.ok
            ? refund.refundStatus === ShopRefundStatus.PROCESSED
              ? "Order cancelled; payment refunded"
              : "Order cancelled; refund in progress"
            : "Order cancelled; refund failed — refund from Razorpay dashboard",
        },
      });
      await releaseStockForOrder(existing.websiteId, existing.id, existing.items);
      throw new AppError(
        400,
        refund.ok
          ? refund.refundStatus === ShopRefundStatus.PROCESSED
            ? "This order was cancelled. Your payment has been refunded."
            : "This order was cancelled. Your refund is in progress."
          : "This order was cancelled. Contact the store — a refund may be needed.",
        "ORDER_CANCELLED",
      );
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.shopOrder.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
        if (order.status !== ShopOrderStatus.PENDING) {
          return { order, items: order.items, stockChanged: false, alreadyPaid: true };
        }

        await deductStockOnce(tx, order.id);

        const paid = await tx.shopOrder.update({
          where: { id: order.id },
          data: {
            status: ShopOrderStatus.PAID,
            razorpayPaymentId,
            paidAt: new Date(),
            failureReason: null,
          },
        });
        await recordOrderStatusEvent(tx, {
          orderId: order.id,
          status: ShopOrderStatus.PAID,
          actorType: "SYSTEM",
          note: "Payment received",
        });

        const variantIds = order.items.map((item) => item.variantId).filter((id): id is string => Boolean(id));
        if (variantIds.length > 0) {
          await tx.shopCartItem.deleteMany({
            where: { websiteId: order.websiteId, customerId: order.customerId, variantId: { in: variantIds } },
          });
        }

        return { order: paid, items: order.items, stockChanged: true, alreadyPaid: false };
      });

      await releaseStockForOrder(result.order.websiteId, result.order.id, result.items);

      if (result.stockChanged) purgeShopPages(result.order.websiteId);
      if (!result.alreadyPaid) {
        logger.info({ websiteId: result.order.websiteId, orderId: result.order.id, number: result.order.number }, "Shop order paid");
        void shopOrderEmailsService.notifyStatusChange(result.order.id, ShopOrderStatus.PAID);
      }
      return result.order;
    } catch (error) {
      if (!isStockFailure(error)) throw error;

      const refund = await this.refundCapturedPayment(
        existing.websiteId,
        existing.id,
        razorpayPaymentId,
        error.message,
      );
      const failReason = refund.ok
        ? refund.refundStatus === ShopRefundStatus.PROCESSED
          ? `Sold out during checkout; payment refunded. ${error.message}`.slice(0, 300)
          : `Sold out during checkout; refund in progress. ${error.message}`.slice(0, 300)
        : `Sold out during checkout; refund failed — refund from Razorpay. ${error.message}`.slice(0, 300);
      await prisma.$transaction(async (tx) => {
        await tx.shopOrder.update({
          where: { id: existing.id },
          data: { status: ShopOrderStatus.FAILED, failureReason: failReason },
        });
        await recordOrderStatusEvent(tx, {
          orderId: existing.id,
          status: ShopOrderStatus.FAILED,
          actorType: "SYSTEM",
          note: failReason,
        });
      });
      void shopOrderEmailsService.notifyStatusChange(existing.id, ShopOrderStatus.FAILED);
      await releaseStockForOrder(existing.websiteId, existing.id, existing.items);
      logger.warn(
        { websiteId: existing.websiteId, orderId: existing.id, refundStatus: refund.refundStatus, ok: refund.ok },
        "Shop order refunded after stock failure",
      );
      throw new AppError(
        409,
        refund.ok
          ? refund.refundStatus === ShopRefundStatus.PROCESSED
            ? "This item sold out during checkout. We've refunded your payment."
            : "This item sold out during checkout. Your refund is in progress."
          : "This item sold out during checkout. Contact the store — a refund may be needed.",
        "STOCK_UNAVAILABLE_REFUNDED",
      );
    }
  }

  /** Updates refundStatus from Razorpay refund webhooks (created / processed / failed). */
  async applyRefundWebhook(websiteId: string, event: RazorpayWebhookEvent): Promise<boolean> {
    const refund = event.payload?.refund?.entity;
    if (!refund?.id || !refund.payment_id) return false;

    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, razorpayPaymentId: refund.payment_id },
      select: { id: true, refundStatus: true },
    });
    if (!order) return false;

    if (event.event === "refund.processed") {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          razorpayRefundId: refund.id,
          refundStatus: ShopRefundStatus.PROCESSED,
          refundedAt: new Date(),
        },
      });
      return true;
    }
    if (event.event === "refund.failed") {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          razorpayRefundId: refund.id,
          refundStatus: ShopRefundStatus.FAILED,
        },
      });
      return true;
    }
    if (event.event === "refund.created") {
      if (order.refundStatus === ShopRefundStatus.PROCESSED) return true;
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          razorpayRefundId: refund.id,
          refundStatus: ShopRefundStatus.PENDING,
        },
      });
      return true;
    }
    return false;
  }

  async markFailed(razorpayOrderId: string, reason: string | null): Promise<void> {
    const pending = await prisma.shopOrder.findMany({
      where: { razorpayOrderId, status: ShopOrderStatus.PENDING },
      select: { id: true, websiteId: true, items: { select: { variantId: true } } },
    });
    const note = reason?.slice(0, 300) || "Payment failed";
    await prisma.$transaction(async (tx) => {
      for (const order of pending) {
        await tx.shopOrder.update({
          where: { id: order.id },
          data: { status: ShopOrderStatus.FAILED, failureReason: note },
        });
        await recordOrderStatusEvent(tx, {
          orderId: order.id,
          status: ShopOrderStatus.FAILED,
          actorType: "SYSTEM",
          note,
        });
      }
    });
    for (const order of pending) {
      await releaseStockForOrder(order.websiteId, order.id, order.items);
      void shopOrderEmailsService.notifyStatusChange(order.id, ShopOrderStatus.FAILED);
    }
  }

  async getCustomerOrder(websiteId: string, customerId: string, orderId: string): Promise<ShopOrderDetailView> {
    await this.meGuard(websiteId, customerId);
    const [order, website] = await Promise.all([
      prisma.shopOrder.findFirst({
        where: { id: orderId, websiteId, customerId },
        include: {
          items: { orderBy: { productName: "asc" } },
          events: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { shopCancelUntilStatus: true },
      }),
    ]);
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    const cancelUntil = website?.shopCancelUntilStatus ?? null;
    return {
      ...toOrderSummary(order, cancelUntil),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        variantName: item.variantName,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        lineTotalPaise: item.lineTotalPaise,
      })),
      timeline: order.events.map(toTimelineEvent),
      failureReason: order.failureReason,
      cancelReason: order.cancelReason,
      paidAt: order.paidAt?.toISOString() ?? null,
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  /**
   * Shopper cancels their own order (when the website policy allows it).
   * Restores deducted stock, releases checkout holds, and refunds a captured payment.
   */
  async cancelCustomerOrder(
    websiteId: string,
    customerId: string,
    orderId: string,
    input: ShopCancelOrderInput,
  ): Promise<ShopOrderDetailView> {
    await this.meGuard(websiteId, customerId);
    const reason = input.reason.trim().slice(0, 500);
    if (reason.length < 3) {
      throw new AppError(400, "Please share a short reason for cancelling.", "CANCEL_REASON_REQUIRED");
    }

    const [existing, website] = await Promise.all([
      prisma.shopOrder.findFirst({
        where: { id: orderId, websiteId, customerId },
        include: { items: true },
      }),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { shopCancelUntilStatus: true, shopEnabled: true },
      }),
    ]);
    if (!existing) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (!website?.shopEnabled) {
      throw new AppError(403, "Shop is not available on this website.", "SHOP_DISABLED");
    }
    if (!canCustomerCancelOrder(existing.status, website.shopCancelUntilStatus)) {
      throw new AppError(
        400,
        "This order can no longer be cancelled.",
        "ORDER_NOT_CANCELLABLE",
      );
    }
    if (
      existing.refundStatus === ShopRefundStatus.PENDING ||
      existing.refundStatus === ShopRefundStatus.PROCESSED
    ) {
      throw new AppError(400, "This order already has a refund in progress.", "REFUND_ALREADY_STARTED");
    }

    const note = `Customer cancelled: ${reason}`.slice(0, 300);
    let stockChanged = false;
    const allowedStatuses = [
      ShopOrderStatus.PENDING,
      ShopOrderStatus.PAID,
      ShopOrderStatus.PROCESSING,
      ShopOrderStatus.SHIPPED,
    ].filter((status) => canCustomerCancelOrder(status, website.shopCancelUntilStatus));

    await prisma.$transaction(async (tx) => {
      const locked = await tx.shopOrder.findFirst({
        where: { id: existing.id, websiteId, customerId, status: { in: allowedStatuses } },
        select: { id: true, status: true },
      });
      if (!locked || !canCustomerCancelOrder(locked.status, website.shopCancelUntilStatus)) {
        throw new AppError(400, "This order can no longer be cancelled.", "ORDER_NOT_CANCELLABLE");
      }
      stockChanged = await restoreStockOnce(tx, existing.id);
      await tx.shopOrder.update({
        where: { id: existing.id },
        data: {
          status: ShopOrderStatus.CANCELLED,
          cancelReason: reason,
          failureReason: note,
        },
      });
      await recordOrderStatusEvent(tx, {
        orderId: existing.id,
        status: ShopOrderStatus.CANCELLED,
        actorType: "CUSTOMER",
        note,
      });
    });

    await releaseStockForOrder(existing.websiteId, existing.id, existing.items);

    let refundMessage = "Order cancelled.";
    if (existing.razorpayPaymentId) {
      const refund = await this.refundCapturedPayment(
        existing.websiteId,
        existing.id,
        existing.razorpayPaymentId,
        reason,
        "shop_customer_cancel",
      );
      const refundNote = refund.ok
        ? refund.refundStatus === ShopRefundStatus.PROCESSED
          ? "Order cancelled; payment refunded"
          : "Order cancelled; refund in progress"
        : "Order cancelled; refund failed — contact the store";
      await prisma.shopOrder.update({
        where: { id: existing.id },
        data: { failureReason: `${refundNote}. ${reason}`.slice(0, 300) },
      });
      refundMessage = refund.ok
        ? refund.refundStatus === ShopRefundStatus.PROCESSED
          ? "Order cancelled. Your payment has been refunded."
          : "Order cancelled. Your refund is in progress."
        : "Order cancelled. Contact the store — a refund may be needed.";
      if (!refund.ok) {
        logger.error(
          { websiteId, orderId: existing.id, paymentId: existing.razorpayPaymentId },
          "Customer cancel refund failed",
        );
      }
    }

    if (stockChanged) purgeShopPages(websiteId);
    void shopOrderEmailsService.notifyStatusChange(existing.id, ShopOrderStatus.CANCELLED);
    logger.info({ websiteId, orderId: existing.id, number: existing.number }, "Shop order cancelled by customer");

    const detail = await this.getCustomerOrder(websiteId, customerId, existing.id);
    // Surface a clear message via failureReason for the UI toast path when refund wording differs.
    if (!existing.razorpayPaymentId) {
      return { ...detail, failureReason: refundMessage };
    }
    return { ...detail, failureReason: detail.failureReason || refundMessage };
  }

  private async meGuard(websiteId: string, customerId: string): Promise<void> {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!customer) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
  }

  async applyWebhook(websiteId: string, event: RazorpayWebhookEvent): Promise<boolean> {
    if (event.event?.startsWith("refund.")) {
      return this.applyRefundWebhook(websiteId, event);
    }

    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id || !payment.id) return false;

    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, razorpayOrderId: payment.order_id },
      select: { id: true },
    });
    if (!order) return false;

    if (event.event === "payment.captured" || event.event === "order.paid") {
      try {
        await this.markPaid(order.id, payment.id);
      } catch (error) {
        // Stock raced away and we refunded (or tried to). Acknowledge so Razorpay stops retrying.
        if (error instanceof AppError && (error.code === "STOCK_UNAVAILABLE_REFUNDED" || error.code === "ORDER_CANCELLED")) {
          return true;
        }
        throw error;
      }
      return true;
    }
    if (event.event === "payment.failed") {
      await this.markFailed(payment.order_id, payment.error_description ?? null);
      return true;
    }
    return false;
  }
}

export const shopCheckoutService = new ShopCheckoutService();
