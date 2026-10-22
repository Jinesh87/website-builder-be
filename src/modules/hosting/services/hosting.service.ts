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
  PaymentOrderStatus,
  Prisma,
  WalletTransactionSource,
  WalletTransactionType,
  WebsiteOfflineReason,
  WebsiteStatus,
  type HostingConfig,
  type HostingPackage,
  type HostingPayment,
  type HostingSubscription,
} from "../../../generated/prisma/client.js";
import { paymentSettingsService } from "../../wallet/services/payment-settings.service.js";
import { applyLedgerEntry, CONNECTS_PER_RUPEE, connectsForPaise, formatConnects } from "../../wallet/services/wallet.service.js";
import { liveSiteEngineService } from "../../websites/services/live-site-engine.service.js";
import type {
  CollectInput,
  HostingPackageView,
  HostingPaymentView,
  HostingSubscriptionView,
  PlanChoice,
  PublicHostingPricingView,
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
  priceFor,
  renewalOpensAt,
  type CustomPricing,
} from "./hosting-period.js";

const CONFIG_ID = "default";
const RECENT_PAYMENTS = 20;

export type HostingRules = Pick<HostingConfig, "enabled" | "allowConnectsPayment" | "reminderDays" | "graceDays">;

const DEFAULT_RULES: HostingRules = { enabled: false, allowConnectsPayment: true, reminderDays: 3, graceDays: 3 };

type Db = Prisma.TransactionClient | typeof prisma;

export type SubscriptionWithPackage = HostingSubscription & { package: HostingPackage | null };

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
  RAZORPAY: "Online (Razorpay)",
};

const OFFLINE_METHODS: ReadonlySet<HostingPaymentMethod> = new Set([
  HostingPaymentMethod.CASH,
  HostingPaymentMethod.UPI,
  HostingPaymentMethod.BANK_TRANSFER,
]);

const WEBSITE_NOT_FOUND = () => new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
const HOSTING_CHANGED = () =>
  new AppError(409, "Hosting for this website was just updated. Reload and try again.", "HOSTING_CHANGED");
const PACKAGE_NOT_AVAILABLE = (message = "This hosting package isn't available.") =>
  new AppError(400, message, "PACKAGE_NOT_AVAILABLE");

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function iso(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}

export function toSubscriptionView(row: SubscriptionWithPackage): HostingSubscriptionView {
  return {
    id: row.id,
    packageId: row.packageId,
    packageName: row.package?.name ?? null,
    isCustomPackage: row.package?.isCustom ?? false,
    cycle: row.cycle,
    status: row.status,
    autoRenew: row.autoRenew,
    customQuarterlyPaise: row.customQuarterlyPaise,
    customYearlyPaise: row.customYearlyPaise,
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
    packageName: row.packageName,
    cycle: row.cycle,
    amountPaise: row.amountPaise,
    connects: row.connects,
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

/** A package as a client or visitor sees it, priced for one website (null = list prices only). */
export function toPackageView(pkg: HostingPackage, website: CustomPricing | null): HostingPackageView {
  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    features: pkg.features,
    featured: pkg.featured,
    isCustom: pkg.isCustom,
    prices: {
      QUARTERLY: priceFor(BillingCycle.QUARTERLY, pkg, website),
      YEARLY: priceFor(BillingCycle.YEARLY, pkg, website),
    },
  };
}

export async function loadHostingRules(db: Db = prisma): Promise<HostingRules> {
  return (await db.hostingConfig.findUnique({ where: { id: CONFIG_ID } })) ?? DEFAULT_RULES;
}

/** Packages on sale, in display order. */
export function loadActivePackages(db: Db = prisma): Promise<HostingPackage[]> {
  return db.hostingPackage.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

/** What a plan's next period costs in paise; null when its package or cycle can't be paid as it stands. */
export function planPrice(subscription: SubscriptionWithPackage | null): number | null {
  if (!subscription?.package) return null;
  return priceFor(subscription.cycle, subscription.package, subscription);
}

/**
 * The price of `cycle` on `pkg` for a website. A hidden package can still be renewed by the plans already on it.
 * Throws PACKAGE_NOT_AVAILABLE when it can't be bought.
 */
export function availablePrice(
  pkg: HostingPackage | null,
  cycle: BillingCycle,
  subscription: SubscriptionWithPackage | null,
): number {
  if (!pkg || (!pkg.active && pkg.id !== subscription?.packageId)) throw PACKAGE_NOT_AVAILABLE();
  const price = priceFor(cycle, pkg, subscription);
  if (price === null) {
    throw PACKAGE_NOT_AVAILABLE(
      pkg.isCustom
        ? "A custom plan needs a price agreed for this website first. Contact us to set it up."
        : `${pkg.name} isn't available with ${CYCLE_LABELS[cycle].toLowerCase()} billing yet.`,
    );
  }
  return price;
}

/** Throws RENEWAL_NOT_OPEN while an active plan is too far from its end to pay the next period. */
export function assertRenewalOpen(subscription: HostingSubscription | null, now: Date): void {
  const opensAt = renewalOpensAt(subscription, now);
  if (opensAt) {
    throw new AppError(
      409,
      `Hosting is paid until ${formatBillingDate(subscription!.currentPeriodEnd!)}. You can renew from ${formatBillingDate(opensAt)}.`,
      "RENEWAL_NOT_OPEN",
    );
  }
}

type PriceLevel = { quarterly: number | null; yearly: number | null };

/** Logs a price change in paise; does nothing when the prices didn't change. */
export async function recordPriceChange(
  db: Db,
  change: {
    scope: HostingPriceScope;
    clientId?: string | null;
    websiteId?: string | null;
    label: string;
    before: PriceLevel;
    after: PriceLevel;
    actorId: string;
  },
): Promise<void> {
  const { before, after } = change;
  if (before.quarterly === after.quarterly && before.yearly === after.yearly) return;
  await db.hostingPriceChange.create({
    data: {
      scope: change.scope,
      clientId: change.clientId ?? null,
      websiteId: change.websiteId ?? null,
      label: change.label.slice(0, 160),
      oldQuarterlyPrice: before.quarterly,
      newQuarterlyPrice: after.quarterly,
      oldYearlyPrice: before.yearly,
      newYearlyPrice: after.yearly,
      changedById: change.actorId,
    },
  });
}

/** A Razorpay order that has been paid; its package, cycle and price were fixed when it was created. */
export type PaidOrder = {
  id: string;
  razorpayPaymentId: string;
  amountPaise: number;
  packageId: string | null;
  packageName: string;
  cycle: BillingCycle;
};

type SettleRequest = {
  websiteId: string;
  /** Package and cycle to pay; auto-renewal leaves it out to keep the plan's own. */
  plan?: PlanChoice;
  payer: HostingPayer;
  method: HostingPaymentMethod;
  actorId: string | null;
  /** Razorpay only. The money is already taken, so the renewal window doesn't apply. */
  order?: PaidOrder;
  reference?: string | null;
  note?: string | null;
  now?: Date;
};

type Charge = { packageId: string | null; packageName: string; cycle: BillingCycle; price: number };

export class HostingService {
  /**
   * Records the next paid period of a website's hosting in one transaction: the connects debit (wallet payments),
   * the new period and the payment record. A period is paid at most once: concurrent payers hit the claim or the
   * unique (subscription, periodStart), and a Razorpay order is applied once.
   * Returns null when the order had already been applied.
   */
  async settle(request: SettleRequest): Promise<HostingPayment | null> {
    const now = request.now ?? new Date();
    const { order } = request;

    let payment: HostingPayment | null;
    try {
      payment = await prisma.$transaction(async (tx) => {
        const website = await tx.website.findUnique({
          where: { id: request.websiteId },
          select: { id: true, name: true, clientId: true, hosting: { include: { package: true } } },
        });
        if (!website) throw WEBSITE_NOT_FOUND();
        const subscription = website.hosting;

        if (order) {
          const claimed = await tx.hostingOrder.updateMany({
            where: { id: order.id, status: { not: PaymentOrderStatus.PAID } },
            data: { status: PaymentOrderStatus.PAID, razorpayPaymentId: order.razorpayPaymentId, paidAt: now, failureReason: null },
          });
          if (claimed.count === 0) return null;
        } else {
          assertRenewalOpen(subscription, now);
        }

        const charge: Charge = order
          ? { packageId: order.packageId, packageName: order.packageName, cycle: order.cycle, price: order.amountPaise }
          : await this.chargeFor(tx, subscription, request.plan);
        const period = nextPeriod(subscription, charge.cycle, now);

        let connects: number | null = null;
        let walletTransactionId: string | null = null;
        if (request.method === HostingPaymentMethod.WALLET) {
          connects = connectsForPaise(charge.price);
          if (connects > 0) {
            if (!(await loadHostingRules(tx)).allowConnectsPayment) {
              throw new AppError(400, "Hosting can't be paid with connects. Please pay online.", "CONNECTS_PAYMENT_DISABLED");
            }
            const wallet = await tx.wallet.findUnique({ where: { clientId: website.clientId }, select: { balance: true } });
            const balance = Number(wallet?.balance ?? 0);
            if (balance < connects) {
              throw new AppError(
                402,
                `Hosting costs ${formatConnects(connects)}, but the balance is ${formatConnects(balance)}. Add connects or pay online.`,
                "INSUFFICIENT_BALANCE",
                { required: connects, balance },
              );
            }
            const entry = await applyLedgerEntry(tx, website.clientId, {
              type: WalletTransactionType.DEBIT,
              source: WalletTransactionSource.HOSTING,
              amount: connects,
              description: `Hosting · ${website.name} · ${charge.packageName} ${CYCLE_LABELS[charge.cycle]} · ${formatPeriod(period.start, period.end)}`,
              userId: request.actorId,
            });
            walletTransactionId = entry.id;
          }
        }

        const periodData = {
          packageId: charge.packageId,
          cycle: charge.cycle,
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
            packageName: charge.packageName.slice(0, 60),
            cycle: charge.cycle,
            amountPaise: charge.price,
            connects,
            periodStart: period.start,
            periodEnd: period.end,
            paidBy: request.payer,
            method: request.method,
            collectedPaise: OFFLINE_METHODS.has(request.method) ? charge.price : null,
            reference: request.reference?.trim() || null,
            note: request.note?.trim() || null,
            walletTransactionId,
            hostingOrderId: order?.id ?? null,
            recordedById: request.actorId,
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw HOSTING_CHANGED();
      throw error;
    }
    if (!payment) return null;

    const restored = await this.restoreIfSuspended(request.websiteId);
    logger.info(
      { websiteId: request.websiteId, paymentId: payment.id, paidBy: payment.paidBy, method: payment.method, restored },
      "Hosting period paid",
    );
    notifyHostingInBackground({ clientId: payment.clientId, websiteId: request.websiteId, websiteName: payment.websiteName }, {
      kind: "PAID",
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      packageName: payment.packageName,
      amountPaise: payment.amountPaise,
      connects: payment.connects,
      method: payment.method,
      paidBy: payment.paidBy,
      restored,
    });
    return payment;
  }

  private async chargeFor(tx: Db, subscription: SubscriptionWithPackage | null, plan?: PlanChoice): Promise<Charge> {
    const packageId = plan?.packageId ?? subscription?.packageId;
    const cycle = plan?.cycle ?? subscription?.cycle;
    if (!packageId || !cycle) throw new AppError(400, "Choose a hosting package first.", "PLAN_REQUIRED");
    const pkg = await tx.hostingPackage.findUnique({ where: { id: packageId } });
    const price = availablePrice(pkg, cycle, subscription);
    return { packageId: pkg!.id, packageName: pkg!.name, cycle, price };
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

  async publicPricing(): Promise<PublicHostingPricingView> {
    const [rules, packages] = await Promise.all([loadHostingRules(), loadActivePackages()]);
    return {
      packages: packages.map((pkg) => toPackageView(pkg, null)),
      allowConnectsPayment: rules.allowConnectsPayment,
      reminderDays: rules.reminderDays,
      graceDays: rules.graceDays,
    };
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
        hosting: { include: { package: true } },
        client: { select: { businessName: true, wallet: { select: { balance: true } } } },
      },
    });
    if (!website) throw WEBSITE_NOT_FOUND();

    const [rules, packages, payments, razorpay] = await Promise.all([
      loadHostingRules(),
      loadActivePackages(),
      prisma.hostingPayment.findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take: RECENT_PAYMENTS,
        include: paymentInclude,
      }),
      paymentSettingsService.isConfigured(),
    ]);
    const now = new Date();
    const subscription = website.hosting;
    const current = subscription?.package;
    const choices = current && !packages.some((pkg) => pkg.id === current.id) ? [...packages, current] : packages;
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
      packages: choices.map((pkg) => toPackageView(pkg, subscription)),
      nextPeriods: { QUARTERLY: periodFor(BillingCycle.QUARTERLY), YEARLY: periodFor(BillingCycle.YEARLY) },
      renewalOpensAt: iso(renewalOpensAt(subscription, now)),
      payment: {
        razorpay,
        connects: rules.allowConnectsPayment,
        connectsPerRupee: CONNECTS_PER_RUPEE,
        balance: Number(website.client.wallet?.balance ?? 0),
      },
      payments: payments.map(toPaymentView),
    };
  }

  /** The client pays the next period from their own connects (when the platform allows it). */
  async payWithConnects(websiteId: string, plan: PlanChoice, actor: AuthUser): Promise<WebsiteHostingView> {
    await this.assertAccess(websiteId, actor);
    await this.settle({ websiteId, plan, payer: HostingPayer.CLIENT, method: HostingPaymentMethod.WALLET, actorId: actor.id });
    return this.getForWebsite(websiteId, actor);
  }

  /** Super Admin records a payment: money collected offline (cash, UPI, bank), or a charge to the client's connects. */
  async adminCollect(websiteId: string, input: CollectInput, actor: AuthUser): Promise<WebsiteHostingView> {
    await this.assertAccess(websiteId, actor);
    await this.settle({
      websiteId,
      plan: { packageId: input.packageId, cycle: input.cycle },
      payer: HostingPayer.ADMIN,
      method: input.method,
      actorId: actor.id,
      reference: input.reference,
      note: input.note,
    });
    return this.getForWebsite(websiteId, actor);
  }

  /**
   * Sets up or changes a website's plan without charging. Package, cycle and prices apply from the next payment;
   * only a Super Admin can set this website's custom price.
   */
  async updatePlan(websiteId: string, input: UpdatePlanInput, actor: AuthUser): Promise<WebsiteHostingView> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...this.scopeFor(actor) },
      select: { id: true, name: true, clientId: true, hosting: { include: { package: true } } },
    });
    if (!website) throw WEBSITE_NOT_FOUND();

    const isAdmin = actor.role === UserRole.SUPER_ADMIN;
    const changesPrice = input.customQuarterlyPaise !== undefined || input.customYearlyPaise !== undefined;
    if (changesPrice && !isAdmin) {
      throw new AppError(403, "Only an admin can change hosting prices.", "FORBIDDEN");
    }

    const current = website.hosting;
    const before = { quarterly: current?.customQuarterlyPaise ?? null, yearly: current?.customYearlyPaise ?? null };
    const after = {
      quarterly: input.customQuarterlyPaise !== undefined ? input.customQuarterlyPaise : before.quarterly,
      yearly: input.customYearlyPaise !== undefined ? input.customYearlyPaise : before.yearly,
    };

    let packageId = input.packageId ?? current?.packageId ?? null;
    if (!packageId && after.quarterly === null && after.yearly === null) {
      throw new AppError(400, "Choose a hosting package first.", "PLAN_REQUIRED");
    }
    const pkg = packageId
      ? await prisma.hostingPackage.findUnique({ where: { id: packageId } })
      : await prisma.hostingPackage.findFirst({ where: { isCustom: true } });
    if (!pkg || (!pkg.active && pkg.id !== current?.packageId)) throw PACKAGE_NOT_AVAILABLE();
    packageId = pkg.id;
    if (pkg.isCustom && after.quarterly === null && after.yearly === null) {
      throw PACKAGE_NOT_AVAILABLE(
        isAdmin
          ? "Set this website's custom price before choosing the custom package."
          : "A custom plan needs a price agreed for this website first. Contact us to set it up.",
      );
    }

    const data = {
      packageId,
      ...(input.cycle ? { cycle: input.cycle } : {}),
      ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
      ...(changesPrice ? { customQuarterlyPaise: after.quarterly, customYearlyPaise: after.yearly } : {}),
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
              cycle: input.cycle ?? BillingCycle.YEARLY,
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

  scopeFor(actor: AuthUser): Prisma.WebsiteWhereInput {
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
