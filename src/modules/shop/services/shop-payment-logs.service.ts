import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { PaymentLogKind } from "../utils/shop-payment-log.js";
import { openShopForAdmin } from "./shop-admin-access.js";

const PAGE_SIZE = 30;

/** Steps an owner doesn't need to see: they always come with a "Payment received" or refund entry. */
const OWNER_HIDDEN: Prisma.ShopPaymentLogWhereInput[] = [
  { kind: "order_created", success: true },
  { kind: "payment_captured", success: true },
  { kind: "webhook", success: true },
];

const CATEGORY_WHERE: Record<ShopPaymentLogCategory, Prisma.ShopPaymentLogWhereInput> = {
  payments: { kind: { in: ["order_created", "payment_verified", "payment_captured", "webhook"] }, NOT: { message: { startsWith: "refund." } } },
  refunds: { OR: [{ kind: "refund" }, { kind: "webhook", message: { startsWith: "refund." } }] },
  problems: { success: false },
};

/** `owner` hides background steps (checkout started, captures, successful webhooks); `technical` shows everything. */
export type ShopPaymentLogView = "owner" | "technical";
export type ShopPaymentLogCategory = "payments" | "refunds" | "problems";

export type ShopPaymentLogQuery = {
  view?: ShopPaymentLogView;
  category?: ShopPaymentLogCategory;
  kind?: PaymentLogKind;
  result?: "success" | "failure";
  /** Order number or a Razorpay id. */
  search?: string;
  page?: number;
};

export type ShopPaymentLogEntryView = {
  id: string;
  kind: string;
  success: boolean;
  orderId: string | null;
  orderNumber: number | null;
  amountPaise: number | null;
  razorpayRef: string | null;
  message: string | null;
  createdAt: string;
};

export type ShopPaymentLogPage = {
  logs: ShopPaymentLogEntryView[];
  page: number;
  pageSize: number;
  total: number;
};

/** The owner's Razorpay logs: every Razorpay call and webhook for the shop, newest first. */
export class ShopPaymentLogsService {
  async list(websiteId: string, query: ShopPaymentLogQuery, actor: AuthUser): Promise<ShopPaymentLogPage> {
    await openShopForAdmin(websiteId, actor);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const search = query.search?.trim();
    const where: Prisma.ShopPaymentLogWhereInput = {
      websiteId,
      ...(query.view !== "technical" ? { NOT: OWNER_HIDDEN } : {}),
      ...(query.category ? CATEGORY_WHERE[query.category] : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.result ? { success: query.result === "success" } : {}),
      ...(search
        ? /^#?\d+$/.test(search)
          ? { orderNumber: Number(search.replace("#", "")) }
          : { razorpayRef: { contains: search, mode: "insensitive" as const } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.shopPaymentLog.count({ where }),
      prisma.shopPaymentLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ]);
    return {
      logs: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        success: row.success,
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        amountPaise: row.amountPaise,
        razorpayRef: row.razorpayRef,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
    };
  }
}

export const shopPaymentLogsService = new ShopPaymentLogsService();
