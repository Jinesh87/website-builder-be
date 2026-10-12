import { prisma } from "../../../config/prisma.js";
import type {
  PaymentOrderStatus,
  Prisma,
  WalletTransactionSource,
  WalletTransactionType,
} from "../../../generated/prisma/client.js";

export type AdminListQuery = {
  search?: string;
  month?: number | "";
  year?: number | "";
  page: number;
  pageSize: number;
};

export type AdminTransactionQuery = AdminListQuery & { type?: WalletTransactionType | ""; source?: WalletTransactionSource | "" };
export type AdminPaymentQuery = AdminListQuery & { status?: PaymentOrderStatus | "" };

type ClientRef = { id: string; businessName: string };
type UserRef = { id: string; fullName: string; email: string } | null;

/** Month within a year, the whole year, or all time when no year is given. */
function period(query: AdminListQuery): { gte: Date; lt: Date } | undefined {
  if (!query.year) return undefined;
  const year = Number(query.year);
  if (query.month) {
    const month = Number(query.month);
    return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
  }
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

function searchClient(search: string | undefined): Prisma.ClientWhereInput | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { businessName: { contains: term, mode: "insensitive" } },
      { users: { some: { OR: [{ email: { contains: term, mode: "insensitive" } }, { fullName: { contains: term, mode: "insensitive" } }] } } },
    ],
  };
}

const userSelect = { select: { id: true, fullName: true, email: true } } as const;
const clientSelect = { select: { id: true, businessName: true } } as const;

export class AdminWalletService {
  async listTransactions(query: AdminTransactionQuery) {
    const client = searchClient(query.search);
    const where: Prisma.WalletTransactionWhereInput = {
      ...(period(query) ? { createdAt: period(query) } : {}),
      ...(client ? { wallet: { client } } : {}),
    };
    const filtered: Prisma.WalletTransactionWhereInput = {
      ...where,
      ...(query.type ? { type: query.type } : {}),
      ...(query.source ? { source: query.source } : {}),
    };

    const [rows, total, groups, balances] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: filtered,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          wallet: { select: { client: clientSelect } },
          user: userSelect,
          paymentOrder: { select: { razorpayOrderId: true, razorpayPaymentId: true } },
        },
      }),
      prisma.walletTransaction.count({ where: filtered }),
      prisma.walletTransaction.groupBy({ by: ["type", "source"], where, _sum: { amountPaise: true }, _count: { _all: true } }),
      prisma.wallet.aggregate({ _sum: { balancePaise: true }, _count: { _all: true }, where: { balancePaise: { gt: 0 } } }),
    ]);

    const sum = (match: (group: (typeof groups)[number]) => boolean) =>
      groups.filter(match).reduce((acc, group) => acc + (group._sum.amountPaise ?? 0), 0);

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        source: row.source,
        amountPaise: row.amountPaise,
        balanceAfterPaise: row.balanceAfterPaise,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        client: row.wallet.client as ClientRef,
        user: row.user as UserRef,
        razorpayOrderId: row.paymentOrder?.razorpayOrderId ?? null,
        razorpayPaymentId: row.paymentOrder?.razorpayPaymentId ?? null,
      })),
      summary: {
        topupsPaise: sum((group) => group.type === "CREDIT" && group.source === "TOPUP"),
        topupCount: groups.filter((g) => g.type === "CREDIT" && g.source === "TOPUP").reduce((acc, g) => acc + g._count._all, 0),
        aiUsagePaise: sum((group) => group.type === "DEBIT" && group.source === "AI_USAGE"),
        adjustmentsPaise:
          sum((group) => group.type === "CREDIT" && group.source === "ADJUSTMENT") -
          sum((group) => group.type === "DEBIT" && group.source === "ADJUSTMENT"),
        /** Current balances across every wallet, regardless of filters. */
        heldBalancePaise: balances._sum.balancePaise ?? 0,
        fundedWallets: balances._count._all,
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listPayments(query: AdminPaymentQuery) {
    const client = searchClient(query.search);
    const where: Prisma.PaymentOrderWhereInput = {
      ...(period(query) ? { createdAt: period(query) } : {}),
      ...(client ? { client } : {}),
    };
    const filtered: Prisma.PaymentOrderWhereInput = { ...where, ...(query.status ? { status: query.status } : {}) };

    const [rows, total, groups] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: filtered,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { client: clientSelect, user: userSelect },
      }),
      prisma.paymentOrder.count({ where: filtered }),
      prisma.paymentOrder.groupBy({ by: ["status"], where, _sum: { amountPaise: true }, _count: { _all: true } }),
    ]);
    const byStatus = (status: PaymentOrderStatus) => groups.find((group) => group.status === status);

    return {
      items: rows.map((row) => ({
        id: row.id,
        razorpayOrderId: row.razorpayOrderId,
        razorpayPaymentId: row.razorpayPaymentId,
        amountPaise: row.amountPaise,
        currency: row.currency,
        status: row.status,
        failureReason: row.failureReason,
        createdAt: row.createdAt.toISOString(),
        paidAt: row.paidAt?.toISOString() ?? null,
        client: row.client as ClientRef,
        user: row.user as UserRef,
      })),
      summary: {
        paidPaise: byStatus("PAID")?._sum.amountPaise ?? 0,
        paidCount: byStatus("PAID")?._count._all ?? 0,
        failedCount: byStatus("FAILED")?._count._all ?? 0,
        /** Checkout opened but never completed (abandoned or still in progress). */
        pendingCount: byStatus("CREATED")?._count._all ?? 0,
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

export const adminWalletService = new AdminWalletService();
