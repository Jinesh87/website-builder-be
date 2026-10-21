import { UserRole } from "../../../common/constants/roles.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  BillingCycle,
  DomainStatus,
  HostingPayer,
  HostingPaymentMethod,
  HostingPriceScope,
  HostingStatus,
  Prisma,
  WalletTransactionSource,
  WalletTransactionType,
  WebsiteOfflineReason,
  WebsiteStatus,
  type HostingConfig,
  type HostingPayment,
  type HostingSubscription,
} from "../../../generated/prisma/client.js";
import { applyLedgerEntry, CONNECTS_PER_RUPEE, formatConnects } from "../../wallet/services/wallet.service.js";
import { liveSiteEngineService } from "../../websites/services/live-site-engine.service.js";
import type {
  CollectInput,
  CyclePriceInput,
  CyclePrices,
  HostingPaymentView,
  HostingSubscriptionView,
  UpdatePlanInput,
  WebsiteHostingView,
} from "../types/hosting.types.js";
import { notifyHostingInBackground } from "./hosting-notifier.js";
import {
  CYCLE_LABELS,
  formatBillingDate,
  formatPeriod,
  isHostingLive,
  nextPeriod,
  offlineCredit,
  renewalOpensAt,
  resolvePrice,
} from "./hosting-period.js";

const CONFIG_ID = "default";
const RECENT_PAYMENTS = 20;

export type HostingRules = Pick<HostingConfig, "enabled" | "quarterlyPrice" | "yearlyPrice" | "reminderDays" | "graceDays">;

const DEFAULT_RULES: HostingRules = { enabled: false, quarterlyPrice: 0, yearlyPrice: 0, reminderDays: 3, graceDays: 3 };

type Db = Prisma.TransactionClient | typeof prisma;

export const paymentInclude = {
  client: { select: { id: true, businessName: true } },
  recordedBy: { select: { id: true, fullName: true } },
} as const satisfies Prisma.HostingPaymentInclude;

type PaymentRow = Prisma.HostingPaymentGetPayload<{ include: typeof paymentInclude }>;

export const METHOD_LABELS: Record<HostingPaymentMethod, string> = {
  WALLET: "Connects",
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
};

const WEBSITE_NOT_FOUND = () => new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
const HOSTING_CHANGED = () =>
  new AppError(409, "Hosting for this website was just updated. Reload and try again.", "HOSTING_CHANGED");

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function iso(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function toSubscriptionView(row: HostingSubscription): HostingSubscriptionView {
  return {
    id: row.id,
    cycle: row.cycle,
    status: row.status,
    autoRenew: row.autoRenew,
    quarterlyPrice: row.quarterlyPrice,
    yearlyPrice: row.yearlyPrice,
    currentPeriodStart: iso(row.currentPeriodStart),
    currentPeriodEnd: iso(row.currentPeriodEnd),
    graceEndsAt: iso(row.graceEndsAt),
    suspendedAt: iso(row.suspendedAt),
  };
}

export function toPaymentView(row: PaymentRow): HostingPaymentView {
  return {
    id: row.id,
    websiteId: row.websiteId,
    websiteName: row.websiteName,
    client: row.client,
    cycle: row.cycle,
    amount: row.amount,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    paidBy: row.paidBy,
    method: row.method,
    collectedPaise: row.collectedPaise,
    reference: row.reference,
    note: row.note,
    recordedBy: row.recordedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadHostingRules(db: Db = prisma): Promise<HostingRules> {
  return (await db.hostingConfig.findUnique({ where: { id: CONFIG_ID } })) ?? DEFAULT_RULES;
}

export function pricesFrom(website: CyclePriceInput | null, client: CyclePriceInput | null, rules: HostingRules): CyclePrices {
  const sources = { website, client, global: rules };
  return {
    QUARTERLY: resolvePrice(BillingCycle.QUARTERLY, sources),
    YEARLY: resolvePrice(BillingCycle.YEARLY, sources),
  };
}

/** Logs a price change; does nothing when the prices didn't change. */
export async function recordPriceChange(
  db: Db,
  change: {
    scope: HostingPriceScope;
    clientId?: string | null;
    websiteId?: string | null;
    label: string;
    before: CyclePriceInput;
    after: CyclePriceInput;
    actorId: string;
  },
): Promise<void> {
  const { before, after } = change;
  if (before.quarterlyPrice === after.quarterlyPrice && before.yearlyPrice === after.yearlyPrice) return;
  await db.hostingPriceChange.create({
    data: {
      scope: change.scope,
      clientId: change.clientId ?? null,
      websiteId: change.websiteId ?? null,
      label: change.label.slice(0, 160),
      oldQuarterlyPrice: before.quarterlyPrice,
      newQuarterlyPrice: after.quarterlyPrice,
      oldYearlyPrice: before.yearlyPrice,
      newYearlyPrice: after.yearlyPrice,
      changedById: change.actorId,
    },
  });
}

type SettleRequest = {
  websiteId: string;
  /** Defaults to the plan's cycle (auto-renewal). */
  cycle?: BillingCycle;
  payer: HostingPayer;
  method: HostingPaymentMethod;
  actorId: string | null;
  /** Money an admin collected outside the platform, credited to the wallet before the charge. */
  offline?: { collectedPaise: number; description: string };
  reference?: string | null;
  note?: string | null;
  now?: Date;
};

export class HostingService {
  /**
   * Pays the next period of a website's hosting from its client's wallet, in one transaction:
   * optional offline credit, the hosting debit, the new period and the payment record.
   * A period is paid at most once: concurrent payers hit the claim or the unique (subscription, periodStart).
   */
  async settle(request: SettleRequest): Promise<HostingPayment> {
    const now = request.now ?? new Date();

    let payment: HostingPayment;
    try {
      payment = await prisma.$transaction(async (tx) => {
        const website = await tx.website.findUnique({
          where: { id: request.websiteId },
          select: { id: true, name: true, clientId: true, hosting: true },
        });
        if (!website) throw WEBSITE_NOT_FOUND();

        const subscription = website.hosting;
        const cycle = request.cycle ?? subscription?.cycle ?? BillingCycle.QUARTERLY;
        const opensAt = renewalOpensAt(subscription, now);
        if (opensAt) {
          throw new AppError(
            409,
            `Hosting is paid until ${formatBillingDate(subscription!.currentPeriodEnd!)}. You can renew from ${formatBillingDate(opensAt)}.`,
            "RENEWAL_NOT_OPEN",
          );
        }

        const [rules, clientPrices] = await Promise.all([
          loadHostingRules(tx),
          tx.clientHostingPrice.findUnique({ where: { clientId: website.clientId } }),
        ]);
        const price = resolvePrice(cycle, { website: subscription, client: clientPrices, global: rules }).amount;
        const period = nextPeriod(subscription, cycle, now);

        if (request.offline) {
          await applyLedgerEntry(tx, website.clientId, {
            type: WalletTransactionType.CREDIT,
            source: WalletTransactionSource.ADJUSTMENT,
            amount: offlineCredit(request.offline.collectedPaise, price, CONNECTS_PER_RUPEE),
            description: request.offline.description,
            userId: request.actorId,
          });
        }

        let walletTransactionId: string | null = null;
        if (price > 0) {
          const wallet = await tx.wallet.findUnique({ where: { clientId: website.clientId }, select: { balance: true } });
          const balance = Number(wallet?.balance ?? 0);
          if (balance < price) {
            throw new AppError(
              402,
              `Hosting costs ${formatConnects(price)}, but the balance is ${formatConnects(balance)}. Add connects to continue.`,
              "INSUFFICIENT_BALANCE",
              { required: price, balance },
            );
          }
          const entry = await applyLedgerEntry(tx, website.clientId, {
            type: WalletTransactionType.DEBIT,
            source: WalletTransactionSource.HOSTING,
            amount: price,
            description: `Hosting · ${website.name} · ${CYCLE_LABELS[cycle]} · ${formatPeriod(period.start, period.end)}`,
            userId: request.actorId,
          });
          walletTransactionId = entry.id;
        }

        const periodData = {
          cycle,
          status: HostingStatus.ACTIVE,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          graceEndsAt: null,
          suspendedAt: null,
        };
        let subscriptionId: string;
        if (subscription) {
          const claimed = await tx.hostingSubscription.updateMany({
            where: { id: subscription.id, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd },
            data: periodData,
          });
          if (claimed.count === 0) throw HOSTING_CHANGED();
          subscriptionId = subscription.id;
        } else {
          const created = await tx.hostingSubscription.create({
            data: { websiteId: website.id, clientId: website.clientId, createdById: request.actorId, ...periodData },
          });
          subscriptionId = created.id;
        }

        return tx.hostingPayment.create({
          data: {
            subscriptionId,
            clientId: website.clientId,
            websiteId: website.id,
            websiteName: website.name.slice(0, 120),
            cycle,
            amount: price,
            periodStart: period.start,
            periodEnd: period.end,
            paidBy: request.payer,
            method: request.method,
            collectedPaise: request.offline?.collectedPaise ?? null,
            reference: request.reference?.trim() || null,
            note: request.note?.trim() || null,
            walletTransactionId,
            recordedById: request.actorId,
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw HOSTING_CHANGED();
      throw error;
    }

    const restored = await this.restoreIfSuspended(request.websiteId);
    logger.info(
      { websiteId: request.websiteId, paymentId: payment.id, paidBy: payment.paidBy, method: payment.method, restored },
      "Hosting period paid",
    );
    notifyHostingInBackground({ clientId: payment.clientId, websiteId: request.websiteId, websiteName: payment.websiteName }, {
      kind: "PAID",
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      amount: payment.amount,
      paidBy: payment.paidBy,
      restored,
    });
    return payment;
  }

  /** Puts a site the billing worker took offline back online with its existing live version. */
  async restoreIfSuspended(websiteId: string): Promise<boolean> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        subdomain: true,
        status: true,
        offlineReason: true,
        liveVersionId: true,
        domains: { where: { status: DomainStatus.ACTIVE }, select: { hostname: true } },
      },
    });
    if (
      !website ||
      website.status !== WebsiteStatus.UNPUBLISHED ||
      website.offlineReason !== WebsiteOfflineReason.BILLING ||
      !website.liveVersionId
    ) {
      return false;
    }
    const { count } = await prisma.website.updateMany({
      where: { id: websiteId, status: WebsiteStatus.UNPUBLISHED, offlineReason: WebsiteOfflineReason.BILLING },
      data: { status: WebsiteStatus.PUBLISHED, offlineReason: null },
    });
    if (count > 0) {
      await this.purge(website.subdomain, website.domains.map((domain) => domain.hostname));
      logger.info({ websiteId }, "Website restored after hosting payment");
    }
    return count > 0;
  }

  /** Takes a live site offline for non-payment; the draft and versions are untouched. */
  async takeOffline(websiteId: string): Promise<boolean> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { subdomain: true, domains: { where: { status: DomainStatus.ACTIVE }, select: { hostname: true } } },
    });
    if (!website) return false;
    const { count } = await prisma.website.updateMany({
      where: { id: websiteId, status: WebsiteStatus.PUBLISHED },
      data: { status: WebsiteStatus.UNPUBLISHED, offlineReason: WebsiteOfflineReason.BILLING },
    });
    if (count > 0) {
      await this.purge(website.subdomain, website.domains.map((domain) => domain.hostname));
      logger.info({ websiteId }, "Website taken offline for unpaid hosting");
    }
    return count > 0;
  }

  /** Publishing needs a paid (or grace) plan while hosting billing is on. */
  async assertCanPublish(websiteId: string): Promise<void> {
    const rules = await loadHostingRules();
    if (!rules.enabled) return;
    const subscription = await prisma.hostingSubscription.findUnique({ where: { websiteId }, select: { status: true } });
    if (!isHostingLive(subscription?.status)) {
      throw new AppError(402, "Choose a hosting plan and pay for it to publish this website.", "HOSTING_REQUIRED");
    }
  }

  async getForWebsite(websiteId: string, actor: AuthUser): Promise<WebsiteHostingView> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...this.scopeFor(actor) },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        offlineReason: true,
        clientId: true,
        hosting: true,
        client: { select: { businessName: true, hostingPrice: true, wallet: { select: { balance: true } } } },
      },
    });
    if (!website) throw WEBSITE_NOT_FOUND();

    const [rules, payments] = await Promise.all([
      loadHostingRules(),
      prisma.hostingPayment.findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take: RECENT_PAYMENTS,
        include: paymentInclude,
      }),
    ]);
    const now = new Date();
    const subscription = website.hosting;
    const periodFor = (cycle: BillingCycle) => {
      const period = nextPeriod(subscription, cycle, now);
      return { start: period.start.toISOString(), end: period.end.toISOString() };
    };

    return {
      enabled: rules.enabled,
      website: {
        id: website.id,
        name: website.name,
        subdomain: website.subdomain,
        status: website.status,
        offlineReason: website.offlineReason,
        clientId: website.clientId,
        clientName: website.client.businessName,
      },
      subscription: subscription && toSubscriptionView(subscription),
      prices: pricesFrom(subscription, website.client.hostingPrice, rules),
      inheritedPrices: pricesFrom(null, website.client.hostingPrice, rules),
      priceLevels: {
        website: { quarterlyPrice: subscription?.quarterlyPrice ?? null, yearlyPrice: subscription?.yearlyPrice ?? null },
        client: {
          quarterlyPrice: website.client.hostingPrice?.quarterlyPrice ?? null,
          yearlyPrice: website.client.hostingPrice?.yearlyPrice ?? null,
        },
        global: { quarterlyPrice: rules.quarterlyPrice, yearlyPrice: rules.yearlyPrice },
      },
      nextPeriods: { QUARTERLY: periodFor(BillingCycle.QUARTERLY), YEARLY: periodFor(BillingCycle.YEARLY) },
      renewalOpensAt: iso(renewalOpensAt(subscription, now)),
      balance: Number(website.client.wallet?.balance ?? 0),
      connectsPerRupee: CONNECTS_PER_RUPEE,
      payments: payments.map(toPaymentView),
    };
  }

  /** The client pays the next period from their own connects. */
  async payFromWallet(websiteId: string, cycle: BillingCycle, actor: AuthUser): Promise<WebsiteHostingView> {
    await this.assertAccess(websiteId, actor);
    await this.settle({ websiteId, cycle, payer: HostingPayer.CLIENT, method: HostingPaymentMethod.WALLET, actorId: actor.id });
    return this.getForWebsite(websiteId, actor);
  }

  /** Super Admin records a payment: money collected offline, or a charge to the client's existing connects. */
  async adminCollect(websiteId: string, input: CollectInput, actor: AuthUser): Promise<WebsiteHostingView> {
    await this.assertAccess(websiteId, actor);
    const reference = input.reference?.trim() || null;
    let offline: SettleRequest["offline"];
    if (input.method !== HostingPaymentMethod.WALLET) {
      const rupees = input.amountRupees ?? 0;
      if (!(rupees > 0)) {
        throw new AppError(400, "Enter the amount you collected.", "VALIDATION_ERROR", [
          { message: "Enter the amount you collected.", path: ["amountRupees"] },
        ]);
      }
      const collectedPaise = Math.round(rupees * 100);
      offline = {
        collectedPaise,
        description: `Hosting payment collected · ${METHOD_LABELS[input.method]}${reference ? ` · ref ${reference}` : ""} · ${formatRupees(collectedPaise)}`,
      };
    }
    await this.settle({
      websiteId,
      cycle: input.cycle,
      payer: HostingPayer.ADMIN,
      method: input.method,
      actorId: actor.id,
      offline,
      reference,
      note: input.note,
    });
    return this.getForWebsite(websiteId, actor);
  }

  /**
   * Sets up or changes a website's plan without charging. Cycle and prices apply from the next payment;
   * only a Super Admin can set this website's own prices.
   */
  async updatePlan(websiteId: string, input: UpdatePlanInput, actor: AuthUser): Promise<WebsiteHostingView> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...this.scopeFor(actor) },
      select: { id: true, name: true, clientId: true, hosting: true },
    });
    if (!website) throw WEBSITE_NOT_FOUND();

    const isAdmin = actor.role === UserRole.SUPER_ADMIN;
    const changesPrice = input.quarterlyPrice !== undefined || input.yearlyPrice !== undefined;
    if (changesPrice && !isAdmin) {
      throw new AppError(403, "Only an admin can change hosting prices.", "FORBIDDEN");
    }

    const current = website.hosting;
    const before: CyclePriceInput = { quarterlyPrice: current?.quarterlyPrice ?? null, yearlyPrice: current?.yearlyPrice ?? null };
    const after: CyclePriceInput = {
      quarterlyPrice: input.quarterlyPrice !== undefined ? input.quarterlyPrice : before.quarterlyPrice,
      yearlyPrice: input.yearlyPrice !== undefined ? input.yearlyPrice : before.yearlyPrice,
    };
    const data = {
      ...(input.cycle ? { cycle: input.cycle } : {}),
      ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
      ...(changesPrice ? after : {}),
    };

    try {
      await prisma.$transaction(async (tx) => {
        if (current) {
          await tx.hostingSubscription.update({ where: { id: current.id }, data });
        } else {
          await tx.hostingSubscription.create({
            data: {
              websiteId: website.id,
              clientId: website.clientId,
              cycle: input.cycle ?? BillingCycle.QUARTERLY,
              createdById: actor.id,
              ...data,
            },
          });
        }
        if (changesPrice) {
          await recordPriceChange(tx, {
            scope: HostingPriceScope.WEBSITE,
            clientId: website.clientId,
            websiteId: website.id,
            label: website.name,
            before,
            after,
            actorId: actor.id,
          });
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw HOSTING_CHANGED();
      throw error;
    }
    logger.info({ websiteId, actorId: actor.id, changes: Object.keys(data) }, "Hosting plan updated");
    return this.getForWebsite(websiteId, actor);
  }

  private scopeFor(actor: AuthUser): Prisma.WebsiteWhereInput {
    if (actor.role === UserRole.SUPER_ADMIN) return {};
    if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
    return { clientId: actor.clientId };
  }

  private async assertAccess(websiteId: string, actor: AuthUser): Promise<void> {
    const found = await prisma.website.count({ where: { id: websiteId, ...this.scopeFor(actor) } });
    if (!found) throw WEBSITE_NOT_FOUND();
  }

  private async purge(subdomain: string, hostnames: string[]): Promise<void> {
    try {
      await liveSiteEngineService.purgeWebsiteCache(subdomain, hostnames);
    } catch (error) {
      logger.warn({ err: error, subdomain }, "Site cache purge failed");
    }
  }
}

export const hostingService = new HostingService();
