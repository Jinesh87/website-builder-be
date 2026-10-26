import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { WalletAutoTopup } from "../../../generated/prisma/client.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import {
  autopayState,
  checkoutContact,
  ENDED_AUTOPAY,
  isUniqueViolation,
  LIVE_AUTOPAY,
  razorpayPlanFor,
  stopRazorpaySubscription,
  type SubscriptionCheckout,
  type SubscriptionConfirmation,
} from "./autopay.js";
import { paymentSettingsService } from "./payment-settings.service.js";
import {
  createRazorpaySubscription,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  isValidSubscriptionSignature,
  type RazorpayKeys,
} from "./razorpay.client.js";
import {
  assertPurchasable,
  formatConnects,
  formatInr,
  PAYMENT_CURRENCY,
  priceInPaise,
  walletService,
  type RazorpayWebhookEvent,
  type RazorpayWebhookPayment,
  type WalletView,
} from "./wallet.service.js";

/** Ten years of monthly charges; Razorpay needs an end, and the client can turn it off any time. */
const TOTAL_MONTHS = 120;

const NOT_FOUND = () => new AppError(404, "Auto top-up not found.", "NOT_FOUND");

/**
 * Monthly connects auto top-up: a Razorpay subscription per client. Every charge becomes a paid payment order and is
 * credited once through the same ledger path as a one-off purchase, whether the checkout callback or the webhook reports it.
 */
export class WalletAutoTopupService {
  /** Starts the mandate for `connects` a month; the first pack is bought when the client approves it. */
  async setup(clientId: string, userId: string, connects: number): Promise<SubscriptionCheckout> {
    assertPurchasable(connects);
    const amountPaise = priceInPaise(connects);
    const existing = await prisma.walletAutoTopup.findUnique({ where: { clientId } });
    if (existing && LIVE_AUTOPAY.has(existing.status) && existing.connects === connects) {
      throw new AppError(409, `Auto top-up is already on for ${formatConnects(connects)} a month.`, "AUTOPAY_ACTIVE");
    }

    const keys = await paymentSettingsService.getKeys();
    if (existing) await this.stop(keys, existing);

    const planId = await razorpayPlanFor(keys, {
      period: "monthly",
      interval: 1,
      itemName: `${formatConnects(connects)} every month`,
      amountPaise,
      currency: PAYMENT_CURRENCY,
    });
    const subscription = await createRazorpaySubscription(keys, {
      planId,
      totalCount: TOTAL_MONTHS,
      notes: { purpose: "connects_auto_topup", clientId },
    });
    const data = { userId, razorpaySubscriptionId: subscription.id, connects, amountPaise, ...autopayState(subscription) };
    await prisma.walletAutoTopup.upsert({ where: { clientId }, create: { clientId, ...data }, update: data });
    logger.info({ clientId, razorpaySubscriptionId: subscription.id, connects }, "Auto top-up started");

    return {
      subscriptionId: subscription.id,
      keyId: keys.keyId,
      amountPaise,
      currency: PAYMENT_CURRENCY,
      description: `Auto top-up · ${formatConnects(connects)} every month`,
      startsAt: null,
      ...(await checkoutContact(clientId, userId)),
    };
  }

  /** Called by the browser after the client approves the mandate; the webhook is the backup if this never arrives. */
  async confirm(clientId: string, input: SubscriptionConfirmation): Promise<WalletView> {
    const row = await prisma.walletAutoTopup.findUnique({ where: { razorpaySubscriptionId: input.razorpaySubscriptionId } });
    if (!row || row.clientId !== clientId) throw NOT_FOUND();

    const keys = await paymentSettingsService.getKeys();
    if (!isValidSubscriptionSignature(keys.keySecret, input.razorpayPaymentId, input.razorpaySubscriptionId, input.razorpaySignature)) {
      throw new AppError(
        400,
        "We couldn't verify this payment. If money was taken, your connects are added automatically.",
        "PAYMENT_VERIFICATION_FAILED",
      );
    }
    await this.sync(keys, row);
    // The approval payment is the first month's pack, unless the mandate was approved with a token amount
    // (e-mandate); then the first charge arrives by webhook.
    const payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
    if (payment.status === "captured" && payment.amount === row.amountPaise) await this.applyCharge(row, payment);
    return walletService.getWallet(clientId);
  }

  /** Turns auto top-up off. Connects already bought stay. */
  async cancel(clientId: string): Promise<WalletView> {
    const row = await prisma.walletAutoTopup.findUnique({ where: { clientId } });
    if (row && !ENDED_AUTOPAY.has(row.status)) {
      await this.stop(await paymentSettingsService.getKeys(), row);
      logger.info({ clientId, razorpaySubscriptionId: row.razorpaySubscriptionId }, "Auto top-up turned off");
    }
    return walletService.getWallet(clientId);
  }

  /** `subscription.*` webhooks for auto top-ups. Returns false when the subscription isn't one. */
  async applyWebhook(event: RazorpayWebhookEvent): Promise<boolean> {
    const subscriptionId = event.payload?.subscription?.entity?.id;
    const row = subscriptionId ? await prisma.walletAutoTopup.findUnique({ where: { razorpaySubscriptionId: subscriptionId } }) : null;
    if (!row) return false;

    const status = await this.sync(await paymentSettingsService.getKeys(), row);
    const payment = event.payload?.payment?.entity;
    if (event.event === "subscription.charged" && payment && (payment.status ?? "captured") === "captured") {
      if (!(await this.applyCharge(row, payment))) return true;
      logger.info({ clientId: row.clientId, razorpayPaymentId: payment.id }, "Auto top-up charged");
    }
    if (LIVE_AUTOPAY.has(row.status) && !LIVE_AUTOPAY.has(status)) {
      await notificationService
        .notifyClient(row.clientId, {
          kind: "AUTO_TOPUP_STOPPED",
          title: "Auto top-up stopped",
          body: `Your monthly top-up of ${formatConnects(row.connects)} stopped because the payment couldn't be taken or the mandate was cancelled. Turn it on again from Connects.`,
          link: "/connects",
        })
        .catch((error: unknown) => logger.error({ err: error }, "Auto top-up notice failed"));
    }
    return true;
  }

  /** Credits one charge; false when it was already credited or doesn't match the mandate. */
  private async applyCharge(row: WalletAutoTopup, payment: RazorpayWebhookPayment): Promise<boolean> {
    if (payment.amount !== row.amountPaise) {
      logger.error(
        { clientId: row.clientId, razorpayPaymentId: payment.id, amount: payment.amount, expected: row.amountPaise },
        "Auto top-up charge doesn't match the mandate",
      );
      await notificationService
        .notifyAdmins({
          kind: "AUTO_TOPUP_ISSUE",
          title: `Auto top-up needs attention: ${formatInr(payment.amount)}`,
          body: `Razorpay payment ${payment.id} doesn't match the client's ${formatInr(row.amountPaise)} auto top-up, so no connects were added.`,
          link: "/admin/transactions",
          clientId: row.clientId,
        })
        .catch((error: unknown) => logger.error({ err: error }, "Auto top-up issue notice failed"));
      return false;
    }
    const razorpayOrderId = payment.order_id ?? payment.id;
    try {
      await prisma.paymentOrder.create({
        data: {
          clientId: row.clientId,
          userId: row.userId,
          razorpayOrderId,
          razorpaySubscriptionId: row.razorpaySubscriptionId,
          connects: row.connects,
          amountPaise: payment.amount,
          currency: PAYMENT_CURRENCY,
        },
      });
    } catch (error) {
      // Already recorded by the other report of this charge; markPaid credits it at most once.
      if (!isUniqueViolation(error)) throw error;
    }
    return (await walletService.markPaid(razorpayOrderId, payment.id, payment.amount)) !== null;
  }

  /** Stores Razorpay's current status; returns it. */
  private async sync(keys: RazorpayKeys, row: WalletAutoTopup) {
    const state = autopayState(await fetchRazorpaySubscription(keys, row.razorpaySubscriptionId));
    await prisma.walletAutoTopup.updateMany({ where: { id: row.id, razorpaySubscriptionId: row.razorpaySubscriptionId }, data: state });
    return state.status;
  }

  private async stop(keys: RazorpayKeys, row: WalletAutoTopup): Promise<void> {
    if (ENDED_AUTOPAY.has(row.status)) return;
    const state = autopayState(await stopRazorpaySubscription(keys, row.razorpaySubscriptionId));
    await prisma.walletAutoTopup.updateMany({ where: { id: row.id, razorpaySubscriptionId: row.razorpaySubscriptionId }, data: state });
  }
}

export const walletAutoTopupService = new WalletAutoTopupService();
