import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { UserRole } from "../../../common/constants/roles.js";
import {
  HostingPaymentMethod,
  HostingPriceScope,
  HostingStatus,
  WebsiteStatus,
  type HostingPackage,
  type Prisma,
} from "../../../generated/prisma/client.js";
import { paymentSettingsService } from "../../wallet/services/payment-settings.service.js";
import { CONNECTS_PER_RUPEE } from "../../wallet/services/wallet.service.js";
import type {
  AdminHostingPackageView,
  BackfillInput,
  ClientAttention,
  ClientHostingView,
  ClientOverviewList,
  ClientOverviewQuery,
  HostingPriceChangeView,
  HostingSettingsView,
  PaymentListQuery,
  SubscriptionListQuery,
  UpdateHostingSettingsInput,
  UpdatePackageInput,
} from "../types/hosting.types.js";
import { addDays, CYCLE_LABELS, formatBillingDate } from "./hosting-period.js";
import {
  availablePrice,
  loadHostingRules,
  METHOD_LABELS,
  paymentInclude,
  planPrice,
  recordPriceChange,
  toPackageView,
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
    unit: row.unit,
    oldQuarterlyPrice: row.oldQuarterlyPrice,
    newQuarterlyPrice: row.newQuarterlyPrice,
    oldYearlyPrice: row.oldYearlyPrice,
    newYearlyPrice: row.newYearlyPrice,
    changedBy: row.changedBy?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function isSellable(pkg: HostingPackage): boolean {
  if (!pkg.active) return false;
  return pkg.isCustom
    ? pkg.defaultQuarterlyPaise > 0 || pkg.defaultYearlyPaise > 0
    : pkg.quarterlyPricePaise > 0 || pkg.yearlyPricePaise > 0;
}

/** The prices a package change is logged with: the list prices, or the custom package's default. */
function packagePrices(pkg: HostingPackage): { quarterly: number; yearly: number } {
  return pkg.isCustom
    ? { quarterly: pkg.defaultQuarterlyPaise, yearly: pkg.defaultYearlyPaise }
    : { quarterly: pkg.quarterlyPricePaise, yearly: pkg.yearlyPricePaise };
}

export class HostingAdminService {
  async settings(): Promise<HostingSettingsView> {
    const [row, packages, plansByPackage, liveSitesWithoutPlan, changes, razorpayConfigured] = await Promise.all([
      prisma.hostingConfig.findUnique({ where: { id: CONFIG_ID } }),
      prisma.hostingPackage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.hostingSubscription.groupBy({ by: ["packageId"], _count: { _all: true } }),
      prisma.website.count({ where: { status: WebsiteStatus.PUBLISHED, hosting: { is: null } } }),
      prisma.hostingPriceChange.findMany({
        orderBy: { createdAt: "desc" },
        take: RECENT_PRICE_CHANGES,
        include: { changedBy: { select: { fullName: true } } },
      }),
      paymentSettingsService.isConfigured(),
    ]);
    const rules = row ?? (await loadHostingRules());
    return {
      enabled: rules.enabled,
      allowConnectsPayment: rules.allowConnectsPayment,
      reminderDays: rules.reminderDays,
      graceDays: rules.graceDays,
      connectsPerRupee: CONNECTS_PER_RUPEE,
      razorpayConfigured,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      packages: packages.map(
        (pkg): AdminHostingPackageView => ({
          ...toPackageView(pkg, null),
          active: pkg.active,
          sortOrder: pkg.sortOrder,
          plans: plansByPackage.find((group) => group.packageId === pkg.id)?._count._all ?? 0,
          updatedAt: pkg.updatedAt.toISOString(),
        }),
      ),
      liveSitesWithoutPlan,
      recentPriceChanges: changes.map(toPriceChangeView),
    };
  }

  async updateSettings(input: UpdateHostingSettingsInput, actor: AuthUser): Promise<HostingSettingsView> {
    if (input.enabled && !(await prisma.hostingPackage.findMany()).some(isSellable)) {
      throw new AppError(400, "Price and show at least one package before turning hosting billing on.", "HOSTING_PRICES_REQUIRED");
    }
    await prisma.hostingConfig.upsert({ where: { id: CONFIG_ID }, create: { id: CONFIG_ID, ...input }, update: input });
    logger.info({ actorId: actor.id, enabled: input.enabled, allowConnectsPayment: input.allowConnectsPayment }, "Hosting settings updated");
    return this.settings();
  }

  /**
   * Edits one package. List prices apply from each plan's next payment; paid periods never change. The custom
   * package's default applies to websites without their own price, and paid custom plans keep the price they paid.
   */
  async updatePackage(packageId: string, input: UpdatePackageInput, actor: AuthUser): Promise<HostingSettingsView> {
    const before = await prisma.hostingPackage.findUnique({ where: { id: packageId } });
    if (!before) throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");

    const prices = before.isCustom
      ? {
          quarterlyPricePaise: 0,
          yearlyPricePaise: 0,
          defaultQuarterlyPaise: input.defaultQuarterlyPaise ?? before.defaultQuarterlyPaise,
          defaultYearlyPaise: input.defaultYearlyPaise ?? before.defaultYearlyPaise,
        }
      : { quarterlyPricePaise: input.quarterlyPricePaise, yearlyPricePaise: input.yearlyPricePaise };
    const features = [...new Set(input.features.map((feature) => feature.trim()).filter(Boolean))];
    const after = { ...before, ...prices, active: input.active };

    await prisma.$transaction(async (tx) => {
      if (input.featured) {
        await tx.hostingPackage.updateMany({ where: { id: { not: packageId }, featured: true }, data: { featured: false } });
      }
      await tx.hostingPackage.update({
        where: { id: packageId },
        data: { name: input.name.trim(), description: input.description.trim(), features, featured: input.featured, active: input.active, ...prices },
      });
      const others = await tx.hostingPackage.findMany({ where: { id: { not: packageId } } });
      const config = await tx.hostingConfig.findUnique({ where: { id: CONFIG_ID } });
      if (config?.enabled && ![after, ...others].some(isSellable)) {
        throw new AppError(
          400,
          "Hosting billing is on, so at least one priced package must stay visible. Turn billing off first.",
          "HOSTING_PRICES_REQUIRED",
        );
      }
      await recordPriceChange(tx, {
        scope: HostingPriceScope.PACKAGE,
        label: input.name.trim(),
        before: packagePrices(before),
        after: packagePrices(after),
        actorId: actor.id,
      });
    });
    logger.info({ actorId: actor.id, packageId, active: input.active }, "Hosting package updated");
    return this.settings();
  }

  /** Gives every published site without a plan a free period, so turning billing on takes nothing offline. */
  async backfill(input: BackfillInput, actor: AuthUser): Promise<{ created: number }> {
    const pkg = await prisma.hostingPackage.findUnique({ where: { id: input.packageId } });
    // The plan must be renewable once the free days end.
    availablePrice(pkg, input.cycle, null);
    const websites = await prisma.website.findMany({
      where: { status: WebsiteStatus.PUBLISHED, hosting: { is: null } },
      select: { id: true, clientId: true },
    });
    const now = new Date();
    const { count } = await prisma.hostingSubscription.createMany({
      data: websites.map((website) => ({
        websiteId: website.id,
        clientId: website.clientId,
        packageId: pkg!.id,
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
        { isInternal: false },
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
      prisma.client.count({ where: { isInternal: false } }),
      prisma.website.count({ where: { client: { isInternal: false } } }),
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
        _sum: { amountPaise: true, collectedPaise: true },
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
            amountPaise: paid?._sum.amountPaise ?? 0,
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
            hosting: { include: { package: true } },
          },
        },
      },
    });
    if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");

    const [payments, totals, lastPayments] = await Promise.all([
      prisma.hostingPayment.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: CLIENT_RECENT_PAYMENTS,
        include: paymentInclude,
      }),
      prisma.hostingPayment.aggregate({ where: { clientId }, _count: { _all: true }, _sum: { amountPaise: true, collectedPaise: true } }),
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
        price: planPrice(website.hosting),
        lastPayment: lastByWebsite.get(website.id) ?? null,
      })),
      payments: payments.map(toPaymentView),
      totals: {
        payments: totals._count._all,
        amountPaise: totals._sum.amountPaise ?? 0,
        collectedPaise: totals._sum.collectedPaise ?? 0,
      },
    };
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

    const [rows, total, byStatus, dueSoon] = await Promise.all([
      prisma.hostingSubscription.findMany({
        where,
        orderBy: [{ currentPeriodEnd: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          package: true,
          website: { select: { id: true, name: true, subdomain: true, status: true, offlineReason: true } },
          client: { select: { id: true, businessName: true } },
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
        price: planPrice(row),
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
      prisma.hostingPayment.groupBy({ by: ["method"], where, _sum: { amountPaise: true, connects: true } }),
    ]);
    const sumOf = (methods: HostingPaymentMethod[]) =>
      totals.filter((group) => methods.includes(group.method)).reduce((sum, group) => sum + (group._sum.amountPaise ?? 0), 0);
    return {
      items: rows.map(toPaymentView),
      summary: {
        payments: total,
        amountPaise: sumOf(Object.values(HostingPaymentMethod)),
        onlinePaise: sumOf([HostingPaymentMethod.RAZORPAY]),
        connectsPaise: sumOf([HostingPaymentMethod.WALLET]),
        connects: totals.find((group) => group.method === HostingPaymentMethod.WALLET)?._sum.connects ?? 0,
        collectedPaise: sumOf([HostingPaymentMethod.CASH, HostingPaymentMethod.UPI, HostingPaymentMethod.BANK_TRANSFER]),
      },
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
      "Package",
      "Billing",
      "Period start",
      "Period end",
      "Amount (INR)",
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
        row.packageName,
        CYCLE_LABELS[row.cycle],
        formatBillingDate(row.periodStart),
        formatBillingDate(row.periodEnd),
        (row.amountPaise / 100).toFixed(2),
        row.connects,
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
