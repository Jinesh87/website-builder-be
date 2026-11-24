import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, ShopOrderChannel, ShopOrderStatus } from "../../../generated/prisma/client.js";
import type { PosDailySummary, PosPaymentMethodLabel, PosReceipt } from "../types/shop-pos.types.js";
import { htmlToPdf } from "../utils/html-to-pdf.js";
import { istRange, reportDays, shopToday } from "../utils/shop-day.js";
import { orderBuyer } from "../utils/shop-order-buyer.js";
import { openShopForAdmin } from "./shop-admin-access.js";
import { shopInvoiceService } from "./shop-invoice.service.js";
import { shopOrderEmailsService } from "./shop-order-emails.service.js";
import { LABEL_FROM_STATUS } from "./shop-order-view.js";

const ENDED = new Set<ShopOrderStatus>([
  ShopOrderStatus.PENDING,
  ShopOrderStatus.FAILED,
  ShopOrderStatus.CANCELLED,
  ShopOrderStatus.RETURNED,
]);

function methodLabel(method: string | null): PosPaymentMethodLabel | null {
  return method ? (method.toLowerCase() as PosPaymentMethodLabel) : null;
}

export class ShopPosReportsService {
  /** Everything a till receipt prints. */
  async receipt(websiteId: string, orderId: string, actor: AuthUser): Promise<PosReceipt> {
    await openShopForAdmin(websiteId, actor);
    const [order, website] = await Promise.all([
      prisma.shopOrder.findFirst({
        where: { id: orderId, websiteId },
        include: {
          items: { orderBy: { productName: "asc" } },
          customer: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      }),
      prisma.website.findUniqueOrThrow({
        where: { id: websiteId },
        select: {
          name: true,
          businessName: true,
          address: true,
          contactPhone: true,
          contactEmail: true,
          gstin: true,
          client: { select: { businessName: true } },
        },
      }),
    ]);
    if (!order) throw new AppError(404, "Sale not found.", "ORDER_NOT_FOUND");
    const cashier = order.posCashierId
      ? await prisma.user.findUnique({ where: { id: order.posCashierId }, select: { fullName: true } })
      : null;

    const byRate = new Map<number, { taxablePaise: number; gstPaise: number }>();
    for (const item of order.items) {
      const row = byRate.get(item.gstPercent) ?? { taxablePaise: 0, gstPaise: 0 };
      row.taxablePaise += item.taxablePaise;
      row.gstPaise += item.gstPaise;
      byRate.set(item.gstPercent, row);
    }
    const buyer = orderBuyer(order);
    const cash = order.posPaymentMethod === "CASH" ? order.posCashReceivedPaise : null;

    return {
      shop: {
        name: website.businessName?.trim() || website.client.businessName?.trim() || website.name,
        address: website.address?.trim() || null,
        phone: website.contactPhone?.trim() || null,
        email: website.contactEmail?.trim() || null,
        gstin: website.gstin?.trim() || null,
      },
      orderNumber: String(order.number),
      createdAt: (order.paidAt ?? order.createdAt).toISOString(),
      status: LABEL_FROM_STATUS[order.status],
      cashierName: cashier?.fullName ?? null,
      customer: { name: buyer.fullName, phone: buyer.phone, email: buyer.email, walkIn: buyer.walkIn },
      items: order.items.map((item) => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPaise: item.unitPricePaise,
        lineTotalPaise: item.lineTotalPaise,
        gstPercent: item.gstPercent,
      })),
      subtotalPaise: order.listAmountPaise ?? order.totalPaise,
      discountPaise: order.discountPaise ?? 0,
      totalPaise: order.totalPaise,
      taxablePaise: order.items.reduce((sum, item) => sum + item.taxablePaise, 0),
      gstPaise: order.items.reduce((sum, item) => sum + item.gstPaise, 0),
      gstByRate: [...byRate]
        .filter(([rate]) => rate > 0)
        .sort(([a], [b]) => a - b)
        .map(([gstPercent, row]) => ({ gstPercent, ...row })),
      payment: {
        method: methodLabel(order.posPaymentMethod),
        cashReceivedPaise: cash,
        changePaise: cash != null ? Math.max(0, cash - order.totalPaise) : null,
        reference: order.posPaymentReference,
        razorpayPaymentId: order.razorpayPaymentId,
      },
    };
  }

  /**
   * Emails the A4 invoice PDF. `to` defaults to the customer's email; a new address typed at the
   * till is saved on a walk-in sale so it's there next time.
   */
  async emailInvoice(websiteId: string, orderId: string, to: string | undefined, actor: AuthUser): Promise<{ to: string }> {
    const invoice = await shopInvoiceService.renderStoreInvoice(websiteId, orderId, actor);
    const order = await prisma.shopOrder.findFirstOrThrow({
      where: { id: orderId, websiteId },
      select: { id: true, customerId: true, posCustomer: true, customer: { select: { fullName: true, email: true } } },
    });
    const buyer = orderBuyer(order);
    const recipient = to?.trim().toLowerCase() || buyer.email;
    if (!recipient) throw new AppError(400, "Enter the customer's email address.", "EMAIL_REQUIRED");

    if (!order.customerId && recipient !== buyer.email) {
      const current = (order.posCustomer as Prisma.JsonObject | null) ?? {};
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { posCustomer: { ...current, email: recipient } },
      });
    }
    const pdf = await htmlToPdf(invoice.html);
    await shopOrderEmailsService.sendPosInvoice(order.id, recipient, { filename: invoice.filename, content: pdf });
    return { to: recipient };
  }

  /** POS totals for a day (`date`, default today) or the days `from` through `to`. */
  async summary(
    websiteId: string,
    query: { date?: string; from?: string; to?: string },
    actor: AuthUser,
  ): Promise<PosDailySummary> {
    await openShopForAdmin(websiteId, actor);
    const days = reportDays(query, shopToday())!;
    const { start, end } = istRange(days.from, days.to);
    const orders = await prisma.shopOrder.findMany({
      where: { websiteId, channel: ShopOrderChannel.POS, createdAt: { gte: start, lt: end } },
      select: { status: true, posPaymentMethod: true, posCashReceivedPaise: true, totalPaise: true, discountPaise: true, paidAt: true },
    });

    const summary: PosDailySummary = {
      date: days.from,
      from: days.from,
      to: days.to,
      salesCount: 0,
      totalPaise: 0,
      discountPaise: 0,
      byMethod: {
        cash: { count: 0, totalPaise: 0 },
        upi: { count: 0, totalPaise: 0 },
        card: { count: 0, totalPaise: 0 },
        razorpay_qr: { count: 0, totalPaise: 0 },
      },
      cashPaise: 0,
      cancelledCount: 0,
      returnedCount: 0,
      returnedPaise: 0,
    };
    for (const order of orders) {
      if (order.status === ShopOrderStatus.RETURNED) {
        summary.returnedCount += 1;
        summary.returnedPaise += order.totalPaise;
      }
      // Only paid sales that were later cancelled count as cancelled sales; abandoned QRs don't.
      if (order.status === ShopOrderStatus.CANCELLED && order.paidAt) summary.cancelledCount += 1;
      if (ENDED.has(order.status) || !order.paidAt) continue;

      const method = methodLabel(order.posPaymentMethod);
      summary.salesCount += 1;
      summary.totalPaise += order.totalPaise;
      summary.discountPaise += order.discountPaise ?? 0;
      if (method) {
        summary.byMethod[method].count += 1;
        summary.byMethod[method].totalPaise += order.totalPaise;
      }
      if (method === "cash") summary.cashPaise += order.totalPaise;
    }
    return summary;
  }
}

export const shopPosReportsService = new ShopPosReportsService();
