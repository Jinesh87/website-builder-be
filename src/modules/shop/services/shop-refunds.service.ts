import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { ShopOrderStatus, ShopRefundStatus } from "../../../generated/prisma/client.js";
import { recordOrderStatusEvent } from "../utils/shop-order-timeline.js";
import { openShopForAdmin } from "./shop-admin-access.js";
import { shopCheckoutService } from "./shop-checkout.service.js";
import { ORDER_PAGE_SIZE, ORDER_VIEW_INCLUDE, toView, type ShopOrderPage, type ShopOrderView } from "./shop-order-view.js";
import { shopOrdersService } from "./shop-orders.service.js";

/** Returned orders, refund-waiting first. `awaiting` = not refunded yet or the refund failed. */
export type ShopReturnFilter = "all" | "awaiting" | "in-progress" | "refunded";

export type ShopReturnPage = ShopOrderPage & {
  counts: { awaiting: number; inProgress: number; refunded: number };
};

export type ShopReturnQuery = {
  filter?: ShopReturnFilter;
  search?: string;
  page?: number;
};

const RETURN_FILTER_STATUSES: Record<Exclude<ShopReturnFilter, "all">, ShopRefundStatus[]> = {
  awaiting: [ShopRefundStatus.NONE, ShopRefundStatus.FAILED],
  "in-progress": [ShopRefundStatus.PENDING],
  refunded: [ShopRefundStatus.PROCESSED],
};

/** Waiting for a refund comes first, then refunds in progress, then refunded. */
function returnPriority(status: ShopRefundStatus): number {
  if (status === ShopRefundStatus.NONE || status === ShopRefundStatus.FAILED) return 0;
  if (status === ShopRefundStatus.PENDING) return 1;
  return 2;
}

/** The Returns tab and the store's manual refunds. */
export class ShopRefundsService {
  /** Return counts by refund state, for the Returns tab and its badge. */
  async summary(websiteId: string, actor: AuthUser): Promise<ShopReturnPage["counts"]> {
    await openShopForAdmin(websiteId, actor);
    return this.countReturns(websiteId);
  }

  private async countReturns(websiteId: string): Promise<ShopReturnPage["counts"]> {
    const grouped = await prisma.shopOrder.groupBy({
      by: ["refundStatus"],
      where: { websiteId, status: ShopOrderStatus.RETURNED },
      _count: true,
    });
    const count = (statuses: ShopRefundStatus[]) =>
      grouped.filter((row) => statuses.includes(row.refundStatus)).reduce((sum, row) => sum + row._count, 0);
    return {
      awaiting: count(RETURN_FILTER_STATUSES.awaiting),
      inProgress: count(RETURN_FILTER_STATUSES["in-progress"]),
      refunded: count(RETURN_FILTER_STATUSES.refunded),
    };
  }

  /**
   * Returned orders for the Returns tab. Orders still waiting for a refund come first (longest waiting first),
   * then refunds in progress, then refunded orders (most recent first).
   */
  async listReturns(websiteId: string, query: ShopReturnQuery, actor: AuthUser): Promise<ShopReturnPage> {
    await openShopForAdmin(websiteId, actor);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const search = query.search?.trim();
    const filter = query.filter ?? "all";
    const base = { websiteId, status: ShopOrderStatus.RETURNED };
    const where = {
      ...base,
      ...(filter !== "all" ? { refundStatus: { in: RETURN_FILTER_STATUSES[filter] } } : {}),
      ...(search
        ? {
            OR: [
              ...(/^\d+$/.test(search) ? [{ number: Number(search) }] : []),
              { customer: { fullName: { contains: search, mode: "insensitive" as const } } },
              { customer: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [counts, rows] = await Promise.all([
      this.countReturns(websiteId),
      prisma.shopOrder.findMany({
        where,
        include: ORDER_VIEW_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 1000,
      }),
    ]);
    const returnedAt = (row: (typeof rows)[number]) =>
      // The first "returned" entry; later ones record the store's refund.
      row.events.find((event) => event.status === ShopOrderStatus.RETURNED)?.createdAt ?? row.updatedAt;
    const sorted = [...rows].sort((left, right) => {
      const byPriority = returnPriority(left.refundStatus) - returnPriority(right.refundStatus);
      if (byPriority !== 0) return byPriority;
      const leftAt = returnedAt(left).getTime();
      const rightAt = returnedAt(right).getTime();
      // Waiting: oldest return first. Everything else: newest first.
      return returnPriority(left.refundStatus) === 0 ? leftAt - rightAt : rightAt - leftAt;
    });

    return {
      orders: sorted.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE).map(toView),
      page,
      pageSize: ORDER_PAGE_SIZE,
      total: sorted.length,
      counts,
    };
  }

  /**
   * Store refunds a returned or cancelled order through Razorpay: the first refund, or a retry after a failure.
   */
  async refundOrder(websiteId: string, orderId: string, actor: AuthUser): Promise<ShopOrderView> {
    await openShopForAdmin(websiteId, actor);
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
    if (existing.status !== ShopOrderStatus.RETURNED && existing.status !== ShopOrderStatus.CANCELLED) {
      throw new AppError(400, "Only returned or cancelled orders can be refunded here.", "REFUND_NOT_ALLOWED");
    }
    if (existing.refundStatus !== ShopRefundStatus.NONE && existing.refundStatus !== ShopRefundStatus.FAILED) {
      throw new AppError(400, "This order has already been refunded or its refund is in progress.", "REFUND_ALREADY_STARTED");
    }
    if (!existing.razorpayPaymentId) {
      throw new AppError(400, "This order has no payment to refund.", "PAYMENT_MISSING");
    }

    const reason = (existing.returnReason || existing.failureReason || "Merchant refund").slice(0, 500);
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
          : "Refund started by store";
      await prisma.shopOrder.update({
        where: { id: existing.id },
        data: {
          failureReason: `${note}. ${reason}`.slice(0, 300),
        },
      });
      await recordOrderStatusEvent(prisma, {
        orderId: existing.id,
        status: existing.status,
        actorType: "CLIENT",
        note,
        userId: actor.id,
      });
      logger.info(
        { websiteId, orderId: existing.id, number: existing.number, refundStatus: refund.refundStatus },
        "Merchant refunded order",
      );
    } else {
      throw new AppError(
        502,
        "Razorpay could not process the refund. Check your payment keys or try again.",
        "REFUND_RETRY_FAILED",
      );
    }

    return shopOrdersService.get(websiteId, orderId, actor);
  }
}

export const shopRefundsService = new ShopRefundsService();
