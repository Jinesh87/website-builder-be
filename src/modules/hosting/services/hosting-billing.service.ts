import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  HostingNoticeKind,
  HostingPayer,
  HostingPaymentMethod,
  HostingStatus,
  Prisma,
  type HostingSubscription,
} from "../../../generated/prisma/client.js";
import { LIVE_AUTOPAY } from "../../wallet/services/autopay.js";
import { connectsForPaise } from "../../wallet/services/wallet.service.js";
import { notifyHostingInBackground, type AutoRenewal, type HostingNoticeTarget } from "./hosting-notifier.js";
import { addDays, DAY_MS } from "./hosting-period.js";
import { hostingService, loadHostingRules, planPrice, type HostingRules } from "./hosting.service.js";

const BATCH_SIZE = 100;

/**
 * How long after a period ends the worker waits for Razorpay's autopay charge before starting the grace days;
 * the plan stays ACTIVE meanwhile rather than "expired".
 */
const AUTOPAY_WAIT_MS = DAY_MS;

const subscriptionInclude = {
  website: { select: { name: true } },
  package: true,
  client: { select: { wallet: { select: { balance: true } } } },
  autopay: { select: { status: true } },
} as const satisfies Prisma.HostingSubscriptionInclude;

type DueSubscription = Prisma.HostingSubscriptionGetPayload<{ include: typeof subscriptionInclude }>;

function target(subscription: DueSubscription): HostingNoticeTarget {
  return { clientId: subscription.clientId, websiteId: subscription.websiteId, websiteName: subscription.website.name };
}

function onAutopay(subscription: DueSubscription): boolean {
  return subscription.autopay !== null && LIVE_AUTOPAY.has(subscription.autopay.status);
}

/**
 * The worker renews from connects only when the platform allows it, the client turned auto-renew on, and the
 * balance covers the price. Free plans renew regardless of balance, which AI usage can push below zero.
 * A plan on autopay never renews from connects as well.
 */
function renewsFromConnects(subscription: DueSubscription, rules: HostingRules): boolean {
  const price = planPrice(subscription);
  if (price === null || !subscription.autoRenew || onAutopay(subscription)) return false;
  if (price === 0) return true;
  return rules.allowConnectsPayment && Number(subscription.client.wallet?.balance ?? 0) >= connectsForPaise(price);
}

function renewsBy(subscription: DueSubscription, rules: HostingRules): AutoRenewal {
  if (onAutopay(subscription)) return "AUTOPAY";
  return renewsFromConnects(subscription, rules) ? "CONNECTS" : null;
}

/** Records that a notice went out for this period; false when it already had (so it is sent once). */
async function claimNotice(subscription: HostingSubscription, kind: HostingNoticeKind, periodEnd: Date): Promise<boolean> {
  try {
    await prisma.hostingNotice.create({ data: { subscriptionId: subscription.id, kind, periodEnd } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

/**
 * One pass of hosting billing. Safe to run concurrently or repeatedly: every status change is a
 * conditional update, payments are unique per period, and notices are unique per period.
 */
export class HostingBillingService {
  async runOnce(now = new Date()): Promise<void> {
    const rules = await loadHostingRules();
    if (!rules.enabled) return;
    await this.sendReminders(rules, now);
    await this.renewDue(rules, now);
    await this.retryGrace(rules, now);
    await this.suspendExpired(now);
  }

  private async sendReminders(rules: HostingRules, now: Date): Promise<void> {
    if (rules.reminderDays <= 0) return;
    const due = await prisma.hostingSubscription.findMany({
      where: { status: HostingStatus.ACTIVE, currentPeriodEnd: { gt: now, lte: addDays(now, rules.reminderDays) } },
      include: subscriptionInclude,
      take: BATCH_SIZE,
    });
    for (const subscription of due) {
      const periodEnd = subscription.currentPeriodEnd!;
      if (!(await claimNotice(subscription, HostingNoticeKind.RENEWAL_REMINDER, periodEnd))) continue;
      notifyHostingInBackground(target(subscription), {
        kind: "RENEWAL_REMINDER",
        periodEnd,
        price: planPrice(subscription),
        renewsBy: renewsBy(subscription, rules),
      });
    }
  }

  /** Ended ACTIVE plans: auto-renew from connects when possible, otherwise start the grace days. */
  private async renewDue(rules: HostingRules, now: Date): Promise<void> {
    const due = await prisma.hostingSubscription.findMany({
      where: {
        status: HostingStatus.ACTIVE,
        currentPeriodEnd: { lte: now },
        // Plans waiting for their autopay charge would otherwise fill every batch.
        NOT: { currentPeriodEnd: { gt: new Date(now.getTime() - AUTOPAY_WAIT_MS) }, autopay: { status: { in: [...LIVE_AUTOPAY] } } },
      },
      include: subscriptionInclude,
      orderBy: { currentPeriodEnd: "asc" },
      take: BATCH_SIZE,
    });
    for (const subscription of due) {
      if (renewsFromConnects(subscription, rules) && (await this.autoRenew(subscription, now))) continue;
      await this.startGrace(subscription, rules, now);
    }
  }

  /** Grace plans with auto-renew are charged as soon as the client has enough connects. */
  private async retryGrace(rules: HostingRules, now: Date): Promise<void> {
    const inGrace = await prisma.hostingSubscription.findMany({
      where: { status: HostingStatus.GRACE, autoRenew: true, graceEndsAt: { gt: now } },
      include: subscriptionInclude,
      take: BATCH_SIZE,
    });
    for (const subscription of inGrace) {
      if (renewsFromConnects(subscription, rules)) await this.autoRenew(subscription, now);
    }
  }

  private async suspendExpired(now: Date): Promise<void> {
    const expired = await prisma.hostingSubscription.findMany({
      where: { status: HostingStatus.GRACE, graceEndsAt: { lte: now } },
      include: subscriptionInclude,
      take: BATCH_SIZE,
    });
    for (const subscription of expired) {
      const claimed = await prisma.hostingSubscription.updateMany({
        where: { id: subscription.id, status: HostingStatus.GRACE, graceEndsAt: subscription.graceEndsAt },
        data: { status: HostingStatus.SUSPENDED, suspendedAt: now },
      });
      if (claimed.count === 0) continue;
      await hostingService.takeOffline(subscription.websiteId);
      if (await claimNotice(subscription, HostingNoticeKind.SUSPENDED, subscription.currentPeriodEnd!)) {
        notifyHostingInBackground(target(subscription), { kind: "SUSPENDED" });
      }
    }
  }

  private async startGrace(subscription: DueSubscription, rules: HostingRules, now: Date): Promise<void> {
    const periodEnd = subscription.currentPeriodEnd!;
    const graceEndsAt = addDays(periodEnd, rules.graceDays);
    const claimed = await prisma.hostingSubscription.updateMany({
      where: { id: subscription.id, status: HostingStatus.ACTIVE, currentPeriodEnd: periodEnd },
      data: { status: HostingStatus.GRACE, graceEndsAt },
    });
    if (claimed.count === 0) return;
    logger.info({ websiteId: subscription.websiteId, graceEndsAt }, "Hosting expired; grace started");
    if (graceEndsAt > now && (await claimNotice(subscription, HostingNoticeKind.EXPIRED, periodEnd))) {
      notifyHostingInBackground(target(subscription), { kind: "EXPIRED", graceEndsAt, price: planPrice(subscription) });
    }
  }

  /** True when the period was paid. A balance spent in the meantime just leaves the plan where it is. */
  private async autoRenew(subscription: DueSubscription, now: Date): Promise<boolean> {
    try {
      await hostingService.settle({
        websiteId: subscription.websiteId,
        payer: HostingPayer.SYSTEM,
        method: HostingPaymentMethod.WALLET,
        actorId: null,
        now,
      });
      return true;
    } catch (error) {
      const expected = ["INSUFFICIENT_BALANCE", "HOSTING_CHANGED", "CONNECTS_PAYMENT_DISABLED", "PACKAGE_NOT_AVAILABLE", "PLAN_REQUIRED"];
      if (error instanceof AppError && expected.includes(error.code)) return false;
      logger.error({ err: error, websiteId: subscription.websiteId }, "Hosting auto-renewal failed");
      return false;
    }
  }
}

export const hostingBillingService = new HostingBillingService();
