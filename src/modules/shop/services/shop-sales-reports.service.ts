import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { ShopOrderChannel, ShopOrderStatus, ShopRefundStatus } from "../../../generated/prisma/client.js";
import type { PosPaymentMethodLabel } from "../types/shop-pos.types.js";
import type { SalesChannelTotals, SalesSummary } from "../types/shop-sales.types.js";
import { istRange, reportDays, shopToday } from "../utils/shop-day.js";
import { openShopForAdmin } from "./shop-admin-access.js";

/** Orders that never became, or no longer are, a sale. */
const NOT_A_SALE = new Set<ShopOrderStatus>([
  ShopOrderStatus.PENDING,
  ShopOrderStatus.FAILED,
  ShopOrderStatus.CANCELLED,
  ShopOrderStatus.RETURNED,
]);

function emptyTotals(): SalesChannelTotals {
  return {
    ordersCount: 0,
    revenuePaise: 0,
    discountPaise: 0,
    averagePaise: 0,
    itemsSold: 0,
    cancelledCount: 0,
    returnedCount: 0,
    returnedPaise: 0,
  };
}

function withAverage(totals: SalesChannelTotals): SalesChannelTotals {
  return { ...totals, averagePaise: totals.ordersCount > 0 ? Math.round(totals.revenuePaise / totals.ordersCount) : 0 };
}

export class ShopSalesReportsService {
  /** Online and POS sales for a day (`date`, default today) or the days `from` through `to`. */
  async summary(websiteId: string, query: { date?: string; from?: string; to?: string }, actor: AuthUser): Promise<SalesSummary> {
    await openShopForAdmin(websiteId, actor);
    const range = reportDays(query, shopToday())!;
    const { start, end } = istRange(range.from, range.to);
    const orders = await prisma.shopOrder.findMany({
      where: { websiteId, createdAt: { gte: start, lt: end } },
      select: {
        channel: true,
        status: true,
        totalPaise: true,
        discountPaise: true,
        paidAt: true,
        posPaymentMethod: true,
        refundStatus: true,
        items: { select: { quantity: true } },
      },
    });

    const online = emptyTotals();
    const pos = emptyTotals();
    const fulfilment = { toFulfil: 0, shipped: 0, delivered: 0 };
    const byPayment: SalesSummary["byPayment"] = {
      online: { count: 0, totalPaise: 0 },
      cash: { count: 0, totalPaise: 0 },
      upi: { count: 0, totalPaise: 0 },
      card: { count: 0, totalPaise: 0 },
      razorpay_qr: { count: 0, totalPaise: 0 },
    };
    const refunds = { count: 0, totalPaise: 0 };

    for (const order of orders) {
      const isPos = order.channel === ShopOrderChannel.POS;
      const totals = isPos ? pos : online;
      if (!order.paidAt) continue;

      if (order.refundStatus === ShopRefundStatus.PROCESSED) {
        refunds.count += 1;
        refunds.totalPaise += order.totalPaise;
      }
      if (order.status === ShopOrderStatus.CANCELLED) totals.cancelledCount += 1;
      if (order.status === ShopOrderStatus.RETURNED) {
        totals.returnedCount += 1;
        totals.returnedPaise += order.totalPaise;
      }
      if (NOT_A_SALE.has(order.status)) continue;

      totals.ordersCount += 1;
      totals.revenuePaise += order.totalPaise;
      totals.discountPaise += order.discountPaise ?? 0;
      totals.itemsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);

      const method: "online" | PosPaymentMethodLabel | null = isPos
        ? order.posPaymentMethod
          ? (order.posPaymentMethod.toLowerCase() as PosPaymentMethodLabel)
          : null
        : "online";
      if (method) {
        byPayment[method].count += 1;
        byPayment[method].totalPaise += order.totalPaise;
      }

      if (!isPos) {
        if (order.status === ShopOrderStatus.PAID || order.status === ShopOrderStatus.PROCESSING) fulfilment.toFulfil += 1;
        else if (order.status === ShopOrderStatus.SHIPPED) fulfilment.shipped += 1;
        else if (order.status === ShopOrderStatus.DELIVERED) fulfilment.delivered += 1;
      }

    }

    const total = emptyTotals();
    for (const key of Object.keys(total) as (keyof SalesChannelTotals)[]) total[key] = online[key] + pos[key];

    return {
      from: range.from,
      to: range.to,
      total: withAverage(total),
      online: withAverage(online),
      pos: withAverage(pos),
      fulfilment,
      byPayment,
      refunds,
    };
  }
}

export const shopSalesReportsService = new ShopSalesReportsService();
