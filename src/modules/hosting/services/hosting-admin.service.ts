import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { UserRole } from "../../../common/constants/roles.js";
import {
  BillingCycle,
  HostingPriceScope,
  HostingStatus,
  WebsiteStatus,
  type Prisma,
} from "../../../generated/prisma/client.js";
import { CONNECTS_PER_RUPEE } from "../../wallet/services/wallet.service.js";
import type {
  ClientAttention,
  ClientHostingView,
  ClientOverviewList,
  ClientOverviewQuery,
  CyclePriceInput,
  HostingPriceChangeView,
  HostingSettingsView,
  PaymentListQuery,
  SubscriptionListQuery,
  UpdateHostingSettingsInput,
} from "../types/hosting.types.js";
import { addDays, CYCLE_LABELS, formatBillingDate } from "./hosting-period.js";
import {
  loadHostingRules,
  METHOD_LABELS,
  paymentInclude,
  pricesFrom,
  recordPriceChange,
  toPaymentView,
  toSubscriptionView,
} from "./hosting.service.js";

const CONFIG_ID = "default";
const RECENT_PRICE_CHANGES = 10;
const CLIENT_RECENT_PAYMENTS = 50;
const CSV_ROW_LIMIT = 10_000;
/** "Due soon" on the subscriptions summary. */
const DUE_SOON_DAYS = 7;

const PAYER_LABELS = { CLIENT: "Client", ADMIN: "Admin", SYSTEM: "Auto-renewal" } as const;

/** Report dates are India calendar days: "2026-04-10" covers 10 Apr 00:00 to 24:00 IST. */
function istDayStart(day: string): Date {
  return new Date(`${day}T00:00:00+05:30`);
}

/** A client's login account: their earliest CLIENT user, as on the clients pages. */
const ownerSelect = {
  where: { role: UserRole.CLIENT },
  orderBy: { createdAt: "asc" },
  take: 1,
  select: { fullName: true, email: true, username: true, phone: true },
} as const satisfies Prisma.Client$usersArgs;

function attentionWhere(attention: ClientAttention | "" | undefined, dueBy: Date): Prisma.ClientWhereInput {
  switch (attention) {
    case "DUE_SOON":
      return { hostingSubscriptions: { some: { status: HostingStatus.ACTIVE, currentPeriodEnd: { lte: dueBy } } } };
    case "GRACE":
      return { hostingSubscriptions: { some: { status: HostingStatus.GRACE } } };
    case "SUSPENDED":
      return { hostingSubscriptions: { some: { status: HostingStatus.SUSPENDED } } };
    case "NO_PLAN":
      return { websites: { some: { hosting: { is: null } } } };
    default:
      return {};
  }
}

function paymentWhere(query: Omit<PaymentListQuery, "page" | "pageSize">): Prisma.HostingPaymentWhereInput {
  const search = query.search?.trim();
  return {
    ...(query.websiteId ? { websiteId: query.websiteId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: istDayStart(query.from) } : {}),
            ...(query.to ? { lt: addDays(istDayStart(query.to), 1) } : {}),
          },
        }
      : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.paidBy ? { paidBy: query.paidBy } : {}),
    ...(search
      ? {
          OR: [
            { websiteName: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            { client: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

/** Quotes a CSV cell, and defuses values a spreadsheet would run as a formula. */
function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toPriceChangeView(
  row: Prisma.HostingPriceChangeGetPayload<{ include: { changedBy: { select: { fullName: true } } } }>,
): HostingPriceChangeView {
  return {
    id: row.id,
    scope: row.scope,
    label: row.label,
    oldQuarterlyPrice: row.oldQuarterlyPrice,
    newQuarterlyPrice: row.newQuarterlyPrice,
    oldYearlyPrice: row.oldYearlyPrice,
    newYearlyPrice: row.newYearlyPrice,
    changedBy: row.changedBy?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class HostingAdminService {
  async settings(): Promise<HostingSettingsView> {
    const [row, liveSitesWithoutPlan, plansOnGlobalPrice, changes] = await Promise.all([
      prisma.hostingConfig.findUnique({ where: { id: CONFIG_ID } }),
      prisma.website.count({ where: { status: WebsiteStatus.PUBLISHED, hosting: { is: null } } }),
      prisma.hostingSubscription.count({
        where: { quarterlyPrice: null, yearlyPrice: null, client: { hostingPrice: { is: null } } },
      }),
      prisma.hostingPriceChange.findMany({
        orderBy: { createdAt: "desc" },
        take: RECENT_PRICE_CHANGES,
        include: { changedBy: { select: { fullName: true } } },
      }),
    ]);
    const rules = row ?? (await loadHostingRules());
    return {
      enabled: rules.enabled,
      quarterlyPrice: rules.quarterlyPrice,
      yearlyPrice: rules.yearlyPrice,
      reminderDays: rules.reminderDays,
      graceDays: rules.graceDays,
      connectsPerRupee: CONNECTS_PER_RUPEE,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      liveSitesWithoutPlan,
      plansOnGlobalPrice,
      recentPriceChanges: changes.map(toPriceChangeView),
    };
  }

  async updateSettings(input: UpdateHostingSettingsInput, actor: AuthUser): Promise<HostingSettingsView> {
    if (input.enabled && (input.quarterlyPrice <= 0 || input.yearlyPrice <= 0)) {
      throw new AppError(400, "Set both prices before turning hosting billing on.", "HOSTING_PRICES_REQUIRED");
    }
    const before = await loadHostingRules();
    await prisma.$transaction(async (tx) => {
      await tx.hostingConfig.upsert({ where: { id: CONFIG_ID }, create: { id: CONFIG_ID, ...input }, update: input });
      await recordPriceChange(tx, {
        scope: HostingPriceScope.GLOBAL,
        label: "Platform default",
        before: { quarterlyPrice: before.quarterlyPrice, yearlyPrice: before.yearlyPrice },
        after: { quarterlyPrice: input.quarterlyPrice, yearlyPrice: input.yearlyPrice },
        actorId: actor.id,
      });
    });
    logger.info({ actorId: actor.id, enabled: input.enabled }, "Hosting settings updated");
    return this.settings();
  }

  /** Gives every published site without a plan a free period, so turning billing on takes nothing offline. */
  async backfill(input: { freeDays: number; cycle: BillingCycle }, actor: AuthUser): Promise<{ created: number }> {
    const websites = await prisma.website.findMany({
      where: { status: WebsiteStatus.PUBLISHED, hosting: { is: null } },
      select: { id: true, clientId: true },
    });
    const now = new Date();
    const { count } = await prisma.hostingSubscription.createMany({
      data: websites.map((website) => ({
        websiteId: website.id,
        clientId: website.clientId,
        cycle: input.cycle,
        status: HostingStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, input.freeDays),
        createdById: actor.id,
      })),
      skipDuplicates: true,
    });
    logger.info({ actorId: actor.id, created: count, freeDays: input.freeDays }, "Hosting plans backfilled");
    return { created: count };
  }

  /** One row per client: website counts, hosting health, next renewal and money paid. */
  async listClients(query: ClientOverviewQuery): Promise<ClientOverviewList> {
    const now = new Date();
    const dueBy = addDays(now, DUE_SOON_DAYS);
    const search = query.search?.trim();
    const where: Prisma.ClientWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { businessName: { contains: search, mode: "insensitive" } },
                {
                  users: {
                    some: {
                      OR: [
                        { email: { contains: search, mode: "insensitive" } },
                        { fullName: { contains: search, mode: "insensitive" } },
                        { username: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
                {
                  websites: {
                    some: {
                      OR: [{ name: { contains: search, mode: "insensitive" } }, { subdomain: { contains: search.toLowerCase() } }],
                    },
                  },
                },
              ],
            }
          : {},
        attentionWhere(query.attention, dueBy),
      ],
    };

    const [total, clients, clientCount, websiteCount, liveCount, dueSoonCount, suspendedCount] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          businessName: true,
          source: true,
          createdAt: true,
          users: ownerSelect,
          wallet: { select: { balance: true } },
        },
      }),
      prisma.client.count(),
      prisma.website.count(),
      prisma.website.count({ where: { status: WebsiteStatus.PUBLISHED } }),
      prisma.hostingSubscription.count({ where: { status: HostingStatus.ACTIVE, currentPeriodEnd: { lte: dueBy } } }),
      prisma.hostingSubscription.count({ where: { status: HostingStatus.SUSPENDED } }),
    ]);

    const ids = clients.map((client) => client.id);
    const inPage = { clientId: { in: ids } };
    const [websiteGroups, planGroups, dueGroups, upcoming, paidGroups] = await Promise.all([
      prisma.website.groupBy({ by: ["clientId", "status"], where: inPage, _count: { _all: true } }),
      prisma.hostingSubscription.groupBy({ by: ["clientId", "status"], where: inPage, _count: { _all: true } }),
      prisma.hostingSubscription.groupBy({
        by: ["clientId"],
        where: { ...inPage, status: HostingStatus.ACTIVE, currentPeriodEnd: { lte: dueBy } },
        _count: { _all: true },
      }),
      prisma.hostingSubscription.findMany({
        where: { ...inPage, status: { in: [HostingStatus.ACTIVE, HostingStatus.GRACE] }, currentPeriodEnd: { not: null } },
        orderBy: { currentPeriodEnd: "asc" },
        distinct: ["clientId"],
        select: { clientId: true, websiteId: true, currentPeriodEnd: true, status: true, website: { select: { name: true } } },
      }),
      prisma.hostingPayment.groupBy({
        by: ["clientId"],
        where: inPage,
        _count: { _all: true },
        _sum: { amount: true, collectedPaise: true },
      }),
    ]);

    const websitesOf = (clientId: string, status: WebsiteStatus) =>
      websiteGroups.find((group) => group.clientId === clientId && group.status === status)?._count._all ?? 0;
    const plansOf = (clientId: string, status: HostingStatus) =>
      planGroups.find((group) => group.clientId === clientId && group.status === status)?._count._all ?? 0;

    return {
      items: clients.map((client) => {
        const owner = client.users[0];
        const websites = {
          published: websitesOf(client.id, WebsiteStatus.PUBLISHED),
          draft: websitesOf(client.id, WebsiteStatus.DRAFT),
          unpublished: websitesOf(client.id, WebsiteStatus.UNPUBLISHED),
        };
        const plans = {
          active: plansOf(client.id, HostingStatus.ACTIVE),
          grace: plansOf(client.id, HostingStatus.GRACE),
          suspended: plansOf(client.id, HostingStatus.SUSPENDED),
          awaitingPayment: plansOf(client.id, HostingStatus.AWAITING_PAYMENT),
        };
        const totalWebsites = websites.published + websites.draft + websites.unpublished;
        const next = upcoming.find((row) => row.clientId === client.id);
        const paid = paidGroups.find((group) => group.clientId === client.id);
        return {
          client: { id: client.id, businessName: client.businessName, source: client.source, createdAt: client.createdAt.toISOString() },
          owner: owner ?? null,
          balance: Number(client.wallet?.balance ?? 0),
          websites: { total: totalWebsites, ...websites },
          hosting: {
            ...plans,
            withoutPlan: Math.max(0, totalWebsites - (plans.active + plans.grace + plans.suspended + plans.awaitingPayment)),
            dueSoon: dueGroups.find((group) => group.clientId === client.id)?._count._all ?? 0,
          },
          nextRenewal: next
            ? { websiteId: next.websiteId, websiteName: next.website.name, date: next.currentPeriodEnd!.toISOString(), status: next.status }
            : null,
          paid: {
            payments: paid?._count._all ?? 0,
            connects: paid?._sum.amount ?? 0,
            collectedPaise: paid?._sum.collectedPaise ?? 0,
          },
        };
      }),
      summary: {
        clients: clientCount,
        websites: websiteCount,
        liveWebsites: liveCount,
        dueSoon: dueSoonCount,
        suspended: suspendedCount,
        dueSoonDays: DUE_SOON_DAYS,
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async clientHosting(clientId: string): Promise<ClientHostingView> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        businessName: true,
        source: true,
        createdAt: true,
        users: ownerSelect,
        hostingPrice: true,
        wallet: { select: { balance: true } },
        websites: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
            offlineReason: true,
            publishedAt: true,
            updatedAt: true,
            hosting: true,
          },
        },
      },
    });
    if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

    const [rules, payments, totals, lastPayments] = await Promise.all([
      loadHostingRules(),
      prisma.hostingPayment.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: CLIENT_RECENT_PAYMENTS,
        include: paymentInclude,
      }),
      prisma.hostingPayment.aggregate({ where: { clientId }, _count: { _all: true }, _sum: { amount: true, collectedPaise: true } }),
      prisma.hostingPayment.findMany({
        where: { clientId, websiteId: { in: client.websites.map((website) => website.id) } },
        orderBy: { createdAt: "desc" },
        distinct: ["websiteId"],
        include: paymentInclude,
      }),
    ]);
    const lastByWebsite = new Map(lastPayments.map((payment) => [payment.websiteId, toPaymentView(payment)]));

    return {
      client: {
        id: client.id,
        businessName: client.businessName,
        source: client.source,
        createdAt: client.createdAt.toISOString(),
        owner: client.users[0] ?? null,
      },
      clientPrices: {
        quarterlyPrice: client.hostingPrice?.quarterlyPrice ?? null,
        yearlyPrice: client.hostingPrice?.yearlyPrice ?? null,
      },
      globalPrices: { quarterlyPrice: rules.quarterlyPrice, yearlyPrice: rules.yearlyPrice },
      balance: Number(client.wallet?.balance ?? 0),
      websites: client.websites.map((website) => ({
        id: website.id,
        name: website.name,
        subdomain: website.subdomain,
        status: website.status,
        offlineReason: website.offlineReason,
        publishedAt: website.publishedAt?.toISOString() ?? null,
        updatedAt: website.updatedAt.toISOString(),
        subscription: website.hosting && toSubscriptionView(website.hosting),
        prices: pricesFrom(website.hosting, client.hostingPrice, rules),
        lastPayment: lastByWebsite.get(website.id) ?? null,
      })),
      payments: payments.map(toPaymentView),
      totals: {
        payments: totals._count._all,
        connects: totals._sum.amount ?? 0,
        collectedPaise: totals._sum.collectedPaise ?? 0,
      },
    };
  }

  /** Both null removes the client's own prices, so their websites use the global price again. */
  async updateClientPrices(clientId: string, input: CyclePriceInput, actor: AuthUser): Promise<ClientHostingView> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { businessName: true, hostingPrice: true },
    });
    if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
    const before: CyclePriceInput = {
      quarterlyPrice: client.hostingPrice?.quarterlyPrice ?? null,
      yearlyPrice: client.hostingPrice?.yearlyPrice ?? null,
    };

    await prisma.$transaction(async (tx) => {
      if (input.quarterlyPrice === null && input.yearlyPrice === null) {
        await tx.clientHostingPrice.deleteMany({ where: { clientId } });
      } else {
        await tx.clientHostingPrice.upsert({ where: { clientId }, create: { clientId, ...input }, update: input });
      }
      await recordPriceChange(tx, {
        scope: HostingPriceScope.CLIENT,
        clientId,
        label: client.businessName,
        before,
        after: input,
        actorId: actor.id,
      });
    });
    logger.info({ clientId, actorId: actor.id }, "Client hosting prices updated");
    return this.clientHosting(clientId);
  }

  async listSubscriptions(query: SubscriptionListQuery) {
    const search = query.search?.trim();
    const now = new Date();
    const base: Prisma.HostingSubscriptionWhereInput = search
      ? {
          OR: [
            { website: { name: { contains: search, mode: "insensitive" } } },
            { website: { subdomain: { contains: search.toLowerCase() } } },
            { client: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};
    const where: Prisma.HostingSubscriptionWhereInput = {
      ...base,
      ...(query.status ? { status: query.status } : {}),
      ...(query.dueWithinDays !== undefined && query.dueWithinDays !== ""
        ? {
            status: query.status || { in: [HostingStatus.ACTIVE, HostingStatus.GRACE] },
            currentPeriodEnd: { lte: addDays(now, Number(query.dueWithinDays)) },
          }
        : {}),
    };

    const [rules, rows, total, byStatus, dueSoon] = await Promise.all([
      loadHostingRules(),
      prisma.hostingSubscription.findMany({
        where,
        orderBy: [{ currentPeriodEnd: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          website: { select: { id: true, name: true, subdomain: true, status: true, offlineReason: true } },
          client: { select: { id: true, businessName: true, hostingPrice: true } },
        },
      }),
      prisma.hostingSubscription.count({ where }),
      prisma.hostingSubscription.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      prisma.hostingSubscription.count({
        where: { ...base, status: HostingStatus.ACTIVE, currentPeriodEnd: { lte: addDays(now, DUE_SOON_DAYS) } },
      }),
    ]);
    const countOf = (status: HostingStatus) => byStatus.find((group) => group.status === status)?._count._all ?? 0;

    return {
      items: rows.map((row) => ({
        subscription: toSubscriptionView(row),
        website: row.website,
        client: { id: row.client.id, businessName: row.client.businessName },
        price: pricesFrom(row, row.client.hostingPrice, rules)[row.cycle],
      })),
      summary: {
        active: countOf(HostingStatus.ACTIVE),
        grace: countOf(HostingStatus.GRACE),
        suspended: countOf(HostingStatus.SUSPENDED),
        awaitingPayment: countOf(HostingStatus.AWAITING_PAYMENT),
        dueSoon,
        dueSoonDays: DUE_SOON_DAYS,
      },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listPayments(query: PaymentListQuery) {
    const where = paymentWhere(query);
    const [rows, total, totals] = await Promise.all([
      prisma.hostingPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: paymentInclude,
      }),
      prisma.hostingPayment.count({ where }),
      prisma.hostingPayment.aggregate({ where, _sum: { amount: true, collectedPaise: true } }),
    ]);
    return {
      items: rows.map(toPaymentView),
      summary: { payments: total, connects: totals._sum.amount ?? 0, collectedPaise: totals._sum.collectedPaise ?? 0 },
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async paymentsCsv(query: Omit<PaymentListQuery, "page" | "pageSize">): Promise<string> {
    const rows = await prisma.hostingPayment.findMany({
      where: paymentWhere(query),
      orderBy: { createdAt: "desc" },
      take: CSV_ROW_LIMIT,
      include: paymentInclude,
    });
    const header = [
      "Paid on",
      "Client",
      "Website",
      "Plan",
      "Period start",
      "Period end",
      "Connects",
      "Paid by",
      "Method",
      "Collected (INR)",
      "Reference",
      "Note",
      "Recorded by",
    ];
    const lines = rows.map((row) =>
      [
        formatBillingDate(row.createdAt),
        row.client.businessName,
        row.websiteName,
        CYCLE_LABELS[row.cycle],
        formatBillingDate(row.periodStart),
        formatBillingDate(row.periodEnd),
        row.amount,
        PAYER_LABELS[row.paidBy],
        METHOD_LABELS[row.method],
        row.collectedPaise === null ? null : (row.collectedPaise / 100).toFixed(2),
        row.reference,
        row.note,
        row.recordedBy?.fullName ?? null,
      ]
        .map(csvCell)
        .join(","),
    );
    return [header.join(","), ...lines].join("\r\n");
  }
}

export const hostingAdminService = new HostingAdminService();
