import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { csvRow, csvRupees } from "../../../common/utils/csv.js";
import { prisma } from "../../../config/prisma.js";
import { ShopOrderChannel, ShopOrderStatus, ShopPosPaymentMethod, ShopRefundStatus } from "../../../generated/prisma/client.js";
import type { SalesChannelTotals, SalesReport } from "../types/shop-sales.types.js";
import { htmlToPdf } from "../utils/html-to-pdf.js";
import { istRange } from "../utils/shop-day.js";
import { orderBuyer } from "../utils/shop-order-buyer.js";
import { salesReportHtml, salesReportPeriod } from "../utils/shop-sales-report-html.js";
import { shopSalesReportsService } from "./shop-sales-reports.service.js";

/** Most orders one export lists; the summary figures always cover the whole period. */
const ORDER_ROW_LIMIT = 10_000;

const STATUS_LABELS: Record<ShopOrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const POS_METHOD_LABELS: Record<ShopPosPaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  RAZORPAY_QR: "Razorpay QR",
};

const PAYMENT_ROWS = [
  ["online", "Online checkout"],
  ["cash", "Cash (POS)"],
  ["upi", "UPI (POS)"],
  ["card", "Card (POS)"],
  ["razorpay_qr", "Razorpay QR (POS)"],
] as const;

/** A summary figure per channel; `money` figures are paise. */
const FIGURES: { label: string; money: boolean; value: (totals: SalesChannelTotals) => number }[] = [
  { label: "Orders", money: false, value: (t) => t.ordersCount },
  { label: "Revenue", money: true, value: (t) => t.revenuePaise },
  { label: "Average order", money: true, value: (t) => t.averagePaise },
  { label: "Items sold", money: false, value: (t) => t.itemsSold },
  { label: "Net sales excl. GST", money: true, value: (t) => t.netSalesPaise },
  { label: "Cost of goods", money: true, value: (t) => t.costPaise },
  { label: "Profit", money: true, value: (t) => t.profitPaise },
  { label: "Discounts", money: true, value: (t) => t.discountPaise },
  { label: "Items without base price", money: false, value: (t) => t.uncostedItems },
  { label: "Cancelled", money: false, value: (t) => t.cancelledCount },
  { label: "Returned", money: false, value: (t) => t.returnedCount },
  { label: "Returned value", money: true, value: (t) => t.returnedPaise },
];

const istDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Query = { date?: string; from?: string; to?: string };

function filename(report: SalesReport, extension: string): string {
  return report.from === report.to ? `sales-${report.from}.${extension}` : `sales-${report.from}-to-${report.to}.${extension}`;
}

export class ShopSalesExportService {
  /** The sales summary and every paid order in the period. */
  async report(websiteId: string, query: Query, actor: AuthUser): Promise<SalesReport> {
    const summary = await shopSalesReportsService.summary(websiteId, query, actor);
    const { start, end } = istRange(summary.from, summary.to);
    const [website, orders] = await Promise.all([
      prisma.website.findUniqueOrThrow({ where: { id: websiteId }, select: { name: true } }),
      prisma.shopOrder.findMany({
        where: { websiteId, createdAt: { gte: start, lt: end }, paidAt: { not: null } },
        orderBy: { createdAt: "asc" },
        take: ORDER_ROW_LIMIT + 1,
        select: {
          number: true,
          createdAt: true,
          channel: true,
          status: true,
          posPaymentMethod: true,
          posCustomer: true,
          couponCode: true,
          discountPaise: true,
          totalPaise: true,
          refundStatus: true,
          customer: { select: { fullName: true, email: true, phone: true } },
          items: { select: { quantity: true } },
        },
      }),
    ]);

    return {
      websiteName: website.name,
      from: summary.from,
      to: summary.to,
      figures: FIGURES.map((figure) => ({
        label: figure.label,
        money: figure.money,
        online: figure.value(summary.online),
        pos: figure.value(summary.pos),
        total: figure.value(summary.total),
      })),
      payments: PAYMENT_ROWS.map(([key, label]) => ({ label, ...summary.byPayment[key] })),
      refunds: summary.refunds,
      fulfilment: summary.fulfilment,
      orders: orders.slice(0, ORDER_ROW_LIMIT).map((order) => {
        const buyer = orderBuyer(order);
        const isPos = order.channel === ShopOrderChannel.POS;
        return {
          number: order.number,
          date: istDateTime.format(order.createdAt),
          channel: isPos ? "POS" : "Online",
          status: STATUS_LABELS[order.status],
          payment: isPos ? (order.posPaymentMethod ? POS_METHOD_LABELS[order.posPaymentMethod] : "") : "Online checkout",
          customer: buyer.fullName,
          email: buyer.email,
          phone: buyer.phone,
          items: order.items.reduce((sum, item) => sum + item.quantity, 0),
          coupon: order.couponCode,
          discountPaise: order.discountPaise ?? 0,
          totalPaise: order.totalPaise,
          refund:
            order.refundStatus === ShopRefundStatus.NONE
              ? ""
              : order.refundStatus.charAt(0) + order.refundStatus.slice(1).toLowerCase(),
        };
      }),
      truncated: orders.length > ORDER_ROW_LIMIT,
    };
  }

  /** The report as one CSV for a spreadsheet. */
  async csv(websiteId: string, query: Query, actor: AuthUser): Promise<{ content: string; filename: string }> {
    const report = await this.report(websiteId, query, actor);
    const amount = (money: boolean, value: number) => (money ? csvRupees(value) : value);
    const lines: string[] = [
      csvRow(["Sales summary", report.websiteName]),
      csvRow(["Period", salesReportPeriod(report)]),
      "",
      csvRow(["Figure", "Online", "POS", "Total"]),
      ...report.figures.map((f) =>
        csvRow([f.money ? `${f.label} (INR)` : f.label, amount(f.money, f.online), amount(f.money, f.pos), amount(f.money, f.total)]),
      ),
      "",
      csvRow(["Payment method", "Orders", "Amount (INR)"]),
      ...report.payments.map((p) => csvRow([p.label, p.count, csvRupees(p.totalPaise)])),
      csvRow(["Refunded", report.refunds.count, csvRupees(report.refunds.totalPaise)]),
      "",
      csvRow(["Online fulfilment", "To fulfil", "Shipped", "Delivered"]),
      csvRow(["", report.fulfilment.toFulfil, report.fulfilment.shipped, report.fulfilment.delivered]),
      "",
      csvRow(["Orders"]),
      csvRow(["Order #", "Date (IST)", "Channel", "Status", "Payment", "Customer", "Email", "Phone", "Items", "Coupon", "Discount (INR)", "Total (INR)", "Refund"]),
      ...report.orders.map((o) =>
        csvRow([
          o.number,
          o.date,
          o.channel,
          o.status,
          o.payment,
          o.customer,
          o.email,
          o.phone,
          o.items,
          o.coupon,
          csvRupees(o.discountPaise),
          csvRupees(o.totalPaise),
          o.refund,
        ]),
      ),
    ];
    if (report.truncated) lines.push(csvRow([`Only the first ${ORDER_ROW_LIMIT} orders are listed; pick a shorter period for the rest.`]));
    return { content: lines.join("\r\n"), filename: filename(report, "csv") };
  }

  /** The report as a printable A4 PDF. */
  async pdf(websiteId: string, query: Query, actor: AuthUser): Promise<{ content: Buffer; filename: string }> {
    const report = await this.report(websiteId, query, actor);
    return { content: await htmlToPdf(salesReportHtml(report, ORDER_ROW_LIMIT)), filename: filename(report, "pdf") };
  }
}

export const shopSalesExportService = new ShopSalesExportService();
