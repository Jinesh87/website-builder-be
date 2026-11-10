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
type UserRef = { id: string; fullName: string; email: string | null } | null;

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
      prisma.walletTransaction.groupBy({ by: ["type", "source"], where, _sum: { amount: true }, _count: { _all: true } }),
      prisma.wallet.aggregate({ _sum: { balance: true }, _count: { _all: true }, where: { balance: { gt: 0 } } }),
    ]);

    const sum = (match: (group: (typeof groups)[number]) => boolean) =>
      Math.round(groups.filter(match).reduce((acc, group) => acc + Number(group._sum.amount ?? 0), 0) * 1000) / 1000;

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        source: row.source,
        amount: Number(row.amount),
        balanceAfter: Number(row.balanceAfter),
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        client: row.wallet.client as ClientRef,
        user: row.user as UserRef,
        razorpayOrderId: row.paymentOrder?.razorpayOrderId ?? null,
        razorpayPaymentId: row.paymentOrder?.razorpayPaymentId ?? null,
      })),
      summary: {
        purchased: sum((group) => group.type === "CREDIT" && group.source === "TOPUP"),
        purchaseCount: groups.filter((g) => g.type === "CREDIT" && g.source === "TOPUP").reduce((acc, g) => acc + g._count._all, 0),
        aiUsage: sum((group) => group.type === "DEBIT" && group.source === "AI_USAGE"),
        adjustments:
          sum((group) => group.type === "CREDIT" && group.source === "ADJUSTMENT") -
          sum((group) => group.type === "DEBIT" && group.source === "ADJUSTMENT"),
        /** Connects currently held across every client, regardless of filters. */
        heldBalance: Number(balances._sum.balance ?? 0),
        fundedWallets: balances._count._all,
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listPayments(query: AdminPaymentQuery) {
    const client = searchClient(query.search);
    const createdAt = period(query);
    const paymentWhere: Prisma.PaymentOrderWhereInput = {
      ...(createdAt ? { createdAt } : {}),
      ...(client ? { client } : {}),
    };
    const hostingWhere: Prisma.HostingOrderWhereInput = {
      ...(createdAt ? { createdAt } : {}),
      ...(client ? { client } : {}),
    };
    const paymentFiltered: Prisma.PaymentOrderWhereInput = {
      ...paymentWhere,
      ...(query.status ? { status: query.status } : {}),
    };
    const hostingFiltered: Prisma.HostingOrderWhereInput = {
      ...hostingWhere,
      ...(query.status ? { status: query.status } : {}),
    };

    const [paymentRefs, hostingRefs, paymentGroups, hostingGroups, paidConnects, paidHosting] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: paymentFiltered,
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.hostingOrder.findMany({
        where: hostingFiltered,
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentOrder.groupBy({ by: ["status"], where: paymentWhere, _sum: { amountPaise: true }, _count: { _all: true } }),
      prisma.hostingOrder.groupBy({ by: ["status"], where: hostingWhere, _sum: { amountPaise: true }, _count: { _all: true } }),
      prisma.paymentOrder.aggregate({
        where: { ...paymentWhere, status: "PAID" },
        _sum: { amountPaise: true },
        _count: { _all: true },
      }),
      prisma.hostingOrder.aggregate({
        where: { ...hostingWhere, status: "PAID" },
        _sum: { amountPaise: true },
        _count: { _all: true },
      }),
    ]);

    const merged = [
      ...paymentRefs.map((row) => ({ id: row.id, createdAt: row.createdAt, kind: "CONNECTS" as const })),
      ...hostingRefs.map((row) => ({ id: row.id, createdAt: row.createdAt, kind: "HOSTING" as const })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = merged.length;
    const pageSlice = merged.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const connectIds = pageSlice.filter((row) => row.kind === "CONNECTS").map((row) => row.id);
    const hostingIds = pageSlice.filter((row) => row.kind === "HOSTING").map((row) => row.id);

    const [paymentRows, hostingRows] = await Promise.all([
      connectIds.length
        ? prisma.paymentOrder.findMany({
            where: { id: { in: connectIds } },
            include: { client: clientSelect, user: userSelect },
          })
        : Promise.resolve([]),
      hostingIds.length
        ? prisma.hostingOrder.findMany({
            where: { id: { in: hostingIds } },
            include: {
              client: clientSelect,
              user: userSelect,
              website: { select: { name: true, subdomain: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const paymentById = new Map(paymentRows.map((row) => [row.id, row]));
    const hostingById = new Map(hostingRows.map((row) => [row.id, row]));
    const cycleLabel = { QUARTERLY: "Quarterly", YEARLY: "Yearly" } as const;

    type PaymentItem = {
      id: string;
      kind: "CONNECTS" | "HOSTING";
      label: string;
      razorpayOrderId: string;
      razorpayPaymentId: string | null;
      connects: number | null;
      amountPaise: number;
      currency: string;
      status: PaymentOrderStatus;
      failureReason: string | null;
      createdAt: string;
      paidAt: string | null;
      client: ClientRef;
      user: UserRef;
    };

    const items: PaymentItem[] = [];
    for (const ref of pageSlice) {
      if (ref.kind === "CONNECTS") {
        const row = paymentById.get(ref.id);
        if (!row) continue;
        items.push({
          id: row.id,
          kind: "CONNECTS",
          label: row.razorpaySubscriptionId ? "Connects auto top-up" : "Connects purchase",
          razorpayOrderId: row.razorpayOrderId,
          razorpayPaymentId: row.razorpayPaymentId,
          connects: row.connects,
          amountPaise: row.amountPaise,
          currency: row.currency,
          status: row.status,
          failureReason: row.failureReason,
          createdAt: row.createdAt.toISOString(),
          paidAt: row.paidAt?.toISOString() ?? null,
          client: row.client as ClientRef,
          user: row.user as UserRef,
        });
        continue;
      }
      const row = hostingById.get(ref.id);
      if (!row) continue;
      const site = row.website ? row.website.name : null;
      const plan = `${row.packageName} · ${cycleLabel[row.cycle]}`;
      items.push({
        id: row.id,
        kind: "HOSTING",
        label: site ? `${plan} · ${site}` : plan,
        razorpayOrderId: row.razorpayOrderId,
        razorpayPaymentId: row.razorpayPaymentId,
        connects: null,
        amountPaise: row.amountPaise,
        currency: row.currency,
        status: row.status,
        failureReason: row.failureReason,
        createdAt: row.createdAt.toISOString(),
        paidAt: row.paidAt?.toISOString() ?? null,
        client: row.client as ClientRef,
        user: row.user as UserRef,
      });
    }

    const statusCount = (status: PaymentOrderStatus) =>
      (paymentGroups.find((group) => group.status === status)?._count._all ?? 0) +
      (hostingGroups.find((group) => group.status === status)?._count._all ?? 0);

    const connectsPaise = paidConnects._sum.amountPaise ?? 0;
    const hostingPaise = paidHosting._sum.amountPaise ?? 0;

    return {
      items,
      summary: {
        paidPaise: connectsPaise + hostingPaise,
        paidCount: (paidConnects._count._all ?? 0) + (paidHosting._count._all ?? 0),
        paidConnectsPaise: connectsPaise,
        paidHostingPaise: hostingPaise,
        failedCount: statusCount("FAILED"),
        /** Checkout opened but never completed (abandoned or still in progress). */
        pendingCount: statusCount("CREATED"),
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

export const adminWalletService = new AdminWalletService();
