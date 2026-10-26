import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { AutopayStatus, BillingCycle, HostingStatus, type HostingAutopay } from "../../../generated/prisma/client.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import {
  autopayState,
  checkoutContact,
  ENDED_AUTOPAY,
  isUniqueViolation,
  LIVE_AUTOPAY,
  razorpayPlanFor,
  stopRazorpaySubscription,
  STOPPABLE_AUTOPAY,
  type SubscriptionCheckout,
  type SubscriptionConfirmation,
} from "../../wallet/services/autopay.js";
import { paymentSettingsService } from "../../wallet/services/payment-settings.service.js";
import {
  createRazorpaySubscription,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  isValidSubscriptionSignature,
  type RazorpayKeys,
  type RazorpayPlanPeriod,
} from "../../wallet/services/razorpay.client.js";
import {
  formatInr,
  PAYMENT_CURRENCY,
  type RazorpayWebhookEvent,
  type RazorpayWebhookPayment,
} from "../../wallet/services/wallet.service.js";
import type { WebsiteHostingView } from "../types/hosting.types.js";
import { hostingCheckoutService } from "./hosting-checkout.service.js";
import { notifyHostingInBackground, type AutopayStopReason } from "./hosting-notifier.js";
import { CYCLE_LABELS } from "./hosting-period.js";
import { hostingService, planPrice } from "./hosting.service.js";

/** Billing interval per cycle, and ten years of charges: Razorpay needs an end, and the client can stop any time. */
const CYCLE_PLAN: Record<BillingCycle, { period: RazorpayPlanPeriod; interval: number; totalCount: number }> = {
  [BillingCycle.QUARTERLY]: { period: "monthly", interval: 3, totalCount: 40 },
  [BillingCycle.YEARLY]: { period: "yearly", interval: 1, totalCount: 10 },
};

/** Razorpay needs the first charge comfortably in the future; a period ending sooner is charged on approval instead. */
const MIN_START_LEAD_MS = 60 * 60 * 1000;

const WEBSITE_NOT_FOUND = () => new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
const AUTOPAY_NOT_FOUND = () => new AppError(404, "Autopay not found.", "NOT_FOUND");

type AutopayWithWebsite = HostingAutopay & { subscription: { websiteId: string; website: { name: string } } };

const withWebsite = { subscription: { select: { websiteId: true, website: { select: { name: true } } } } } as const;

/** The mandate charges exactly what the plan costs now, for the same package and cycle. */
function matchesPlan(
  autopay: HostingAutopay,
  plan: { packageId: string | null; cycle: BillingCycle },
  price: number | null,
): boolean {
  return autopay.packageId === plan.packageId && autopay.cycle === plan.cycle && autopay.amountPaise === price;
}

function noticeTarget(autopay: AutopayWithWebsite) {
  return { clientId: autopay.clientId, websiteId: autopay.subscription.websiteId, websiteName: autopay.subscription.website.name };
}

/**
 * Hosting autopay: a Razorpay subscription that renews one website's plan on the client's card or UPI mandate.
 * Each charge is recorded as a hosting order and applied through the checkout path, so it lands exactly once and
 * a charge that can't be applied is flagged for the admins.
 */
export class HostingAutopayService {
  /**
   * Starts the mandate for the website's saved plan. An active period is charged when it ends; otherwise the
   * first period is charged as soon as the client approves.
   */
  async setup(websiteId: string, actor: AuthUser): Promise<SubscriptionCheckout> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...hostingService.scopeFor(actor) },
      select: { id: true, name: true, clientId: true, hosting: { include: { package: true, autopay: true } } },
    });
    if (!website) throw WEBSITE_NOT_FOUND();
    const subscription = website.hosting;
    const pkg = subscription?.package;
    if (!subscription || !pkg) throw new AppError(400, "Choose and save a hosting plan first.", "PLAN_REQUIRED");
    const price = planPrice(subscription);
    if (price === null) throw new AppError(400, "This plan has no price yet, so it can't renew by autopay.", "PACKAGE_NOT_AVAILABLE");
    if (price === 0) throw new AppError(400, "This plan is free, so there's nothing for autopay to charge.", "AUTOPAY_NOT_NEEDED");

    const existing = subscription.autopay;
    if (existing && LIVE_AUTOPAY.has(existing.status) && matchesPlan(existing, subscription, price)) {
      throw new AppError(409, "Autopay is already on for this plan.", "AUTOPAY_ACTIVE");
    }

    const keys = await paymentSettingsService.getKeys();
    if (existing) await this.stop(keys, existing);

    const periodEnd = subscription.currentPeriodEnd;
    const startAt =
      subscription.status === HostingStatus.ACTIVE && periodEnd && periodEnd.getTime() - Date.now() > MIN_START_LEAD_MS ? periodEnd : null;
    const { period, interval, totalCount } = CYCLE_PLAN[subscription.cycle];
    const planName = `${pkg.name} hosting · ${CYCLE_LABELS[subscription.cycle]}`;
    const planId = await razorpayPlanFor(keys, { period, interval, itemName: planName, amountPaise: price, currency: PAYMENT_CURRENCY });
    const created = await createRazorpaySubscription(keys, {
      planId,
      totalCount,
      ...(startAt ? { startAt } : {}),
      notes: { purpose: "hosting_autopay", websiteId, clientId: website.clientId },
    });

    const data = {
      clientId: website.clientId,
      userId: actor.id,
      razorpaySubscriptionId: created.id,
      packageId: pkg.id,
      packageName: pkg.name.slice(0, 60),
      cycle: subscription.cycle,
      amountPaise: price,
      startAt,
      ...autopayState(created),
    };
    await prisma.hostingAutopay.upsert({
      where: { subscriptionId: subscription.id },
      create: { subscriptionId: subscription.id, ...data },
      update: data,
    });
    logger.info({ websiteId, razorpaySubscriptionId: created.id, amountPaise: price, startAt }, "Hosting autopay started");

    return {
      subscriptionId: created.id,
      keyId: keys.keyId,
      amountPaise: price,
      currency: PAYMENT_CURRENCY,
      description: `Autopay · ${planName} · ${website.name}`.slice(0, 255),
      startsAt: startAt?.toISOString() ?? null,
      ...(await checkoutContact(website.clientId, actor.id)),
    };
  }

  /** Called by the browser after the client approves the mandate; the webhooks are the backup if this never arrives. */
  async confirm(websiteId: string, input: SubscriptionConfirmation, actor: AuthUser): Promise<WebsiteHostingView> {
    const autopay = await prisma.hostingAutopay.findUnique({
      where: { razorpaySubscriptionId: input.razorpaySubscriptionId },
      include: withWebsite,
    });
    if (!autopay || autopay.subscription.websiteId !== websiteId || autopay.clientId !== actor.clientId) throw AUTOPAY_NOT_FOUND();

    const keys = await paymentSettingsService.getKeys();
    if (!isValidSubscriptionSignature(keys.keySecret, input.razorpayPaymentId, input.razorpaySubscriptionId, input.razorpaySignature)) {
      throw new AppError(400, "We couldn't verify the autopay approval. Please try again.", "PAYMENT_VERIFICATION_FAILED");
    }
    await this.sync(keys, autopay);

    // With no start date, the approval payment is the first period's charge. A mandate approved with a token
    // amount (e-mandate) is charged later, and that charge arrives by webhook.
    if (!autopay.startAt) {
      const payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
      if (payment.status === "captured" && payment.amount === autopay.amountPaise) {
        try {
          await this.applyCharge(autopay, payment);
        } catch (error) {
          if (error instanceof AppError && error.code === "HOSTING_CHANGED") {
            throw new AppError(409, "Your payment was received. Hosting activates in a moment; refresh to see it.", "PAYMENT_PROCESSING");
          }
          throw error;
        }
      }
    }
    return hostingService.getForWebsite(websiteId, actor);
  }

  /** Turns autopay off straight away. The period already paid stays. */
  async cancel(websiteId: string, actor: AuthUser): Promise<WebsiteHostingView> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...hostingService.scopeFor(actor) },
      select: { hosting: { select: { autopay: true } } },
    });
    if (!website) throw WEBSITE_NOT_FOUND();
    const autopay = website.hosting?.autopay;
    if (autopay && !ENDED_AUTOPAY.has(autopay.status)) {
      await this.stop(await paymentSettingsService.getKeys(), autopay);
      logger.info({ websiteId, razorpaySubscriptionId: autopay.razorpaySubscriptionId, actorId: actor.id }, "Hosting autopay turned off");
    }
    return hostingService.getForWebsite(websiteId, actor);
  }

  /**
   * A charge must never apply a plan or price the client didn't approve, so a changed plan turns autopay off and
   * asks the client to approve the new amount. Returns true when it did.
   */
  async afterPlanChange(websiteId: string): Promise<boolean> {
    const subscription = await prisma.hostingSubscription.findUnique({
      where: { websiteId },
      include: { package: true, autopay: { include: withWebsite } },
    });
    const autopay = subscription?.autopay;
    if (!subscription || !autopay || ENDED_AUTOPAY.has(autopay.status) || matchesPlan(autopay, subscription, planPrice(subscription))) {
      return false;
    }
    try {
      await this.stop(await paymentSettingsService.getKeys(), autopay);
    } catch (error) {
      logger.error({ err: error, websiteId, razorpaySubscriptionId: autopay.razorpaySubscriptionId }, "Autopay not stopped after plan change");
      await this.alertAdmins(
        autopay,
        `Couldn't stop autopay for ${autopay.subscription.website.name} after its plan changed`,
        `Cancel Razorpay subscription ${autopay.razorpaySubscriptionId} from the Razorpay dashboard, or its next charge renews the old plan.`,
      );
      return false;
    }
    if (STOPPABLE_AUTOPAY.has(autopay.status)) notifyHostingInBackground(noticeTarget(autopay), { kind: "AUTOPAY_STOPPED", reason: "PLAN_CHANGED" });
    return true;
  }

  /** A package's list price changed: every autopay on it that no longer matches is turned off. */
  async afterPackageChange(packageId: string): Promise<void> {
    const autopays = await prisma.hostingAutopay.findMany({
      where: { packageId, status: { in: [...STOPPABLE_AUTOPAY] } },
      select: { subscription: { select: { websiteId: true } } },
    });
    for (const autopay of autopays) await this.afterPlanChange(autopay.subscription.websiteId);
  }

  /** Before a website is deleted: its mandate must not keep charging for hosting that no longer exists. */
  async stopForWebsite(websiteId: string): Promise<void> {
    const autopay = await prisma.hostingAutopay.findFirst({ where: { subscription: { websiteId } } });
    if (!autopay || ENDED_AUTOPAY.has(autopay.status)) return;
    try {
      await this.stop(await paymentSettingsService.getKeys(), autopay);
    } catch (error) {
      logger.error({ err: error, websiteId }, "Autopay not stopped before website delete");
      throw new AppError(502, "Couldn't turn off this website's autopay, so it wasn't deleted. Please try again.", "AUTOPAY_CANCEL_FAILED");
    }
  }

  /** `subscription.*` webhooks for hosting. Returns false when the subscription isn't a hosting autopay. */
  async applyWebhook(event: RazorpayWebhookEvent): Promise<boolean> {
    const subscriptionId = event.payload?.subscription?.entity?.id;
    const autopay = subscriptionId
      ? await prisma.hostingAutopay.findUnique({ where: { razorpaySubscriptionId: subscriptionId }, include: withWebsite })
      : null;
    if (!autopay) return false;

    const status = await this.sync(await paymentSettingsService.getKeys(), autopay);
    const payment = event.payload?.payment?.entity;
    if (event.event === "subscription.charged" && payment && (payment.status ?? "captured") === "captured") {
      try {
        if (await this.applyCharge(autopay, payment)) {
          logger.info({ websiteId: autopay.subscription.websiteId, razorpayPaymentId: payment.id }, "Hosting autopay charge applied");
        }
      } catch (error) {
        // Already flagged for the admins; acknowledge so Razorpay stops retrying.
        if (!(error instanceof AppError && error.code === "HOSTING_PAYMENT_NOT_APPLIED")) throw error;
      }
    }
    if (LIVE_AUTOPAY.has(autopay.status) && !LIVE_AUTOPAY.has(status)) {
      const reason: AutopayStopReason = status === AutopayStatus.HALTED ? "PAYMENT_FAILED" : "STOPPED";
      notifyHostingInBackground(noticeTarget(autopay), { kind: "AUTOPAY_STOPPED", reason });
    }
    return true;
  }

  /** Records one charge as a hosting order and applies it; false when it was already applied or doesn't match. */
  private async applyCharge(autopay: AutopayWithWebsite, payment: RazorpayWebhookPayment): Promise<boolean> {
    if (payment.amount !== autopay.amountPaise) {
      logger.error(
        { websiteId: autopay.subscription.websiteId, razorpayPaymentId: payment.id, amount: payment.amount, expected: autopay.amountPaise },
        "Hosting autopay charge doesn't match the mandate",
      );
      await this.alertAdmins(
        autopay,
        `Hosting autopay needs attention: ${formatInr(payment.amount)}`,
        `Razorpay payment ${payment.id} for ${autopay.subscription.website.name} doesn't match its ${formatInr(autopay.amountPaise)} autopay, so no period was added. Apply or refund it by hand.`,
      );
      return false;
    }
    const razorpayOrderId = payment.order_id ?? payment.id;
    try {
      await prisma.hostingOrder.create({
        data: {
          clientId: autopay.clientId,
          websiteId: autopay.subscription.websiteId,
          userId: autopay.userId,
          packageId: autopay.packageId,
          packageName: autopay.packageName,
          cycle: autopay.cycle,
          amountPaise: payment.amount,
          currency: payment.currency ?? PAYMENT_CURRENCY,
          razorpayOrderId,
          razorpaySubscriptionId: autopay.razorpaySubscriptionId,
        },
      });
    } catch (error) {
      // Already recorded by the other report of this charge; applyPaidOrder applies it at most once.
      if (!isUniqueViolation(error)) throw error;
    }
    return hostingCheckoutService.applyPaidOrder(razorpayOrderId, payment.id, payment.amount);
  }

  /** Stores Razorpay's current status and returns it. Approved autopay takes over from connects auto-renewal. */
  private async sync(keys: RazorpayKeys, autopay: HostingAutopay): Promise<AutopayStatus> {
    const state = autopayState(await fetchRazorpaySubscription(keys, autopay.razorpaySubscriptionId));
    await prisma.hostingAutopay.updateMany({
      where: { id: autopay.id, razorpaySubscriptionId: autopay.razorpaySubscriptionId },
      data: state,
    });
    if (LIVE_AUTOPAY.has(state.status)) {
      await prisma.hostingSubscription.updateMany({ where: { id: autopay.subscriptionId, autoRenew: true }, data: { autoRenew: false } });
    }
    return state.status;
  }

  private async stop(keys: RazorpayKeys, autopay: HostingAutopay): Promise<void> {
    if (ENDED_AUTOPAY.has(autopay.status)) return;
    const state = autopayState(await stopRazorpaySubscription(keys, autopay.razorpaySubscriptionId));
    await prisma.hostingAutopay.updateMany({
      where: { id: autopay.id, razorpaySubscriptionId: autopay.razorpaySubscriptionId },
      data: state,
    });
  }

  private async alertAdmins(autopay: HostingAutopay, title: string, body: string): Promise<void> {
    await notificationService
      .notifyAdmins({ kind: "HOSTING_AUTOPAY_ISSUE", title, body, link: "/admin/hosting?tab=payments", clientId: autopay.clientId })
      .catch((error: unknown) => logger.error({ err: error }, "Autopay issue notice failed"));
  }
}

export const hostingAutopayService = new HostingAutopayService();

/** A charge Razorpay reports for a subscription this app no longer knows: the money must be refunded or applied by hand. */
export async function alertUnknownSubscriptionCharge(event: RazorpayWebhookEvent): Promise<void> {
  const payment = event.payload?.payment?.entity;
  const subscriptionId = event.payload?.subscription?.entity?.id;
  logger.error({ razorpaySubscriptionId: subscriptionId, razorpayPaymentId: payment?.id }, "Charge for an unknown Razorpay subscription");
  await notificationService
    .notifyAdmins({
      kind: "AUTOPAY_UNKNOWN_CHARGE",
      title: `Autopay charge needs attention${payment ? `: ${formatInr(payment.amount)}` : ""}`,
      body: `Razorpay charged payment ${payment?.id ?? "?"} on subscription ${subscriptionId ?? "?"}, which no website or wallet uses any more. Refund it from the Razorpay dashboard and cancel the subscription.`,
      link: "/admin/hosting?tab=payments",
    })
    .catch((error: unknown) => logger.error({ err: error }, "Unknown charge notice failed"));
}
