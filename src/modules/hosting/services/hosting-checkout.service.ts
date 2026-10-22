import { randomBytes } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { HostingPayer, HostingPaymentMethod, PaymentOrderStatus, type HostingOrder } from "../../../generated/prisma/client.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import { paymentSettingsService } from "../../wallet/services/payment-settings.service.js";
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayPayment,
  isValidPaymentSignature,
} from "../../wallet/services/razorpay.client.js";
import { formatInr, PAYMENT_CURRENCY, type RazorpayWebhookEvent } from "../../wallet/services/wallet.service.js";
import type {
  HostingCheckoutResult,
  PlanChoice,
  RazorpayConfirmation,
  WebsiteHostingView,
} from "../types/hosting.types.js";
import { CYCLE_LABELS } from "./hosting-period.js";
import { assertRenewalOpen, availablePrice, hostingService } from "./hosting.service.js";

/** A plan that changed while the payment was in flight is re-read and the period applied again. */
const APPLY_ATTEMPTS = 3;

const UNAPPLIED_PREFIX = "Paid but not applied: ";

const ORDER_NOT_FOUND = () => new AppError(404, "Payment not found.", "NOT_FOUND");
const NOT_APPLIED = () =>
  new AppError(
    409,
    "Your payment was received, but we couldn't activate hosting automatically. Our team has been notified and will sort it out.",
    "HOSTING_PAYMENT_NOT_APPLIED",
  );

/** Hosting paid online: one Razorpay order per period, applied exactly once from the checkout callback or the webhook. */
export class HostingCheckoutService {
  /** Starts a Razorpay payment for the next period; a free plan is activated straight away instead. */
  async createCheckout(websiteId: string, plan: PlanChoice, actor: AuthUser): Promise<HostingCheckoutResult> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...hostingService.scopeFor(actor) },
      select: {
        id: true,
        name: true,
        clientId: true,
        hosting: { include: { package: true } },
        client: { select: { businessName: true } },
      },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");

    assertRenewalOpen(website.hosting, new Date());
    const pkg = await prisma.hostingPackage.findUnique({ where: { id: plan.packageId } });
    const price = availablePrice(pkg, plan.cycle, website.hosting);

    if (price === 0) {
      await hostingService.settle({ websiteId, plan, payer: HostingPayer.CLIENT, method: HostingPaymentMethod.WALLET, actorId: actor.id });
      return { status: "PAID", hosting: await hostingService.getForWebsite(websiteId, actor) };
    }

    const keys = await paymentSettingsService.getKeys();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { fullName: true, email: true, phone: true },
    });
    const order = await createRazorpayOrder(keys, {
      amountPaise: price,
      currency: PAYMENT_CURRENCY,
      receipt: `hosting_${randomBytes(8).toString("hex")}`,
      notes: { purpose: "hosting", websiteId, clientId: website.clientId, packageId: pkg!.id, cycle: plan.cycle },
    });
    await prisma.hostingOrder.create({
      data: {
        clientId: website.clientId,
        websiteId,
        userId: actor.id,
        packageId: pkg!.id,
        packageName: pkg!.name,
        cycle: plan.cycle,
        amountPaise: price,
        currency: PAYMENT_CURRENCY,
        razorpayOrderId: order.id,
      },
    });
    logger.info({ websiteId, razorpayOrderId: order.id, amountPaise: price }, "Hosting checkout started");

    return {
      status: "CHECKOUT",
      checkout: {
        orderId: order.id,
        keyId: keys.keyId,
        amountPaise: price,
        currency: PAYMENT_CURRENCY,
        businessName: website.client.businessName,
        description: `${pkg!.name} hosting · ${CYCLE_LABELS[plan.cycle]} · ${website.name}`.slice(0, 255),
        prefill: {
          name: user.fullName,
          ...(user.email ? { email: user.email } : {}),
          ...(user.phone ? { contact: user.phone } : {}),
        },
      },
    };
  }

  /** Called by the browser after Razorpay Checkout succeeds; the webhook is the backup if this never arrives. */
  async confirm(websiteId: string, input: RazorpayConfirmation, actor: AuthUser): Promise<WebsiteHostingView> {
    const order = await prisma.hostingOrder.findUnique({ where: { razorpayOrderId: input.razorpayOrderId } });
    if (!order || order.websiteId !== websiteId || order.clientId !== actor.clientId) throw ORDER_NOT_FOUND();

    const keys = await paymentSettingsService.getKeys();
    if (!isValidPaymentSignature(keys.keySecret, input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      throw new AppError(
        400,
        "We couldn't verify this payment. If money was taken, hosting is activated automatically.",
        "PAYMENT_VERIFICATION_FAILED",
      );
    }

    let payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.amountPaise || payment.currency !== order.currency) {
      throw new AppError(400, "This payment doesn't match the order.", "PAYMENT_VERIFICATION_FAILED");
    }
    if (payment.status === "authorized") {
      payment = await captureRazorpayPayment(keys, payment.id, order.amountPaise, order.currency);
    }
    if (payment.status !== "captured") {
      throw new AppError(400, "The payment hasn't completed yet. Hosting is activated as soon as it does.", "PAYMENT_PENDING");
    }

    try {
      await this.applyPaidOrder(order.razorpayOrderId, payment.id, payment.amount);
    } catch (error) {
      if (error instanceof AppError && error.code === "HOSTING_CHANGED") {
        throw new AppError(409, "Your payment was received. Hosting activates in a moment; refresh to see it.", "PAYMENT_PROCESSING");
      }
      throw error;
    }
    return hostingService.getForWebsite(websiteId, actor);
  }

  /**
   * Records the period a paid order bought, exactly once however often it's reported. Returns true when this call
   * applied it. A payment that can't be applied (e.g. the website was deleted) is flagged for the admins.
   */
  async applyPaidOrder(razorpayOrderId: string, razorpayPaymentId: string, amountPaise: number): Promise<boolean> {
    const order = await prisma.hostingOrder.findUnique({ where: { razorpayOrderId } });
    if (!order) throw ORDER_NOT_FOUND();
    if (amountPaise !== order.amountPaise) {
      throw new AppError(400, "Paid amount doesn't match the order.", "PAYMENT_VERIFICATION_FAILED");
    }
    if (order.status === PaymentOrderStatus.PAID) return false;
    if (!order.websiteId) {
      await this.flagUnapplied(order, razorpayPaymentId, "The website was deleted before the payment arrived.");
      throw NOT_APPLIED();
    }

    for (let attempt = 1; ; attempt++) {
      try {
        const payment = await hostingService.settle({
          websiteId: order.websiteId,
          payer: HostingPayer.CLIENT,
          method: HostingPaymentMethod.RAZORPAY,
          actorId: order.userId,
          order: {
            id: order.id,
            razorpayPaymentId,
            amountPaise: order.amountPaise,
            packageId: order.packageId,
            packageName: order.packageName,
            cycle: order.cycle,
          },
        });
        return payment !== null;
      } catch (error) {
        if (error instanceof AppError && error.code === "HOSTING_CHANGED") {
          if (attempt < APPLY_ATTEMPTS) continue;
          throw error;
        }
        if (error instanceof AppError) {
          await this.flagUnapplied(order, razorpayPaymentId, error.message);
          throw NOT_APPLIED();
        }
        throw error;
      }
    }
  }

  /** Razorpay webhook for hosting orders. Returns false when the event is about another kind of order. */
  async applyWebhook(event: RazorpayWebhookEvent): Promise<boolean> {
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) return false;
    const known = await prisma.hostingOrder.findUnique({ where: { razorpayOrderId: payment.order_id }, select: { id: true } });
    if (!known) return false;

    if (event.event === "payment.captured" || event.event === "order.paid") {
      try {
        if (await this.applyPaidOrder(payment.order_id, payment.id, payment.amount)) {
          logger.info({ razorpayOrderId: payment.order_id }, "Hosting payment applied from webhook");
        }
      } catch (error) {
        // Already flagged for the admins; acknowledge so Razorpay stops retrying.
        if (error instanceof AppError && error.code === "HOSTING_PAYMENT_NOT_APPLIED") return true;
        throw error;
      }
    } else if (event.event === "payment.failed") {
      await prisma.hostingOrder.updateMany({
        where: { razorpayOrderId: payment.order_id, status: PaymentOrderStatus.CREATED, razorpayPaymentId: null },
        data: { status: PaymentOrderStatus.FAILED, failureReason: payment.error_description?.slice(0, 500) ?? "Payment failed" },
      });
    }
    return true;
  }

  /** Keeps the payment id and reason on the order and tells the admins once, so the money can be applied or refunded. */
  private async flagUnapplied(order: HostingOrder, razorpayPaymentId: string, reason: string): Promise<void> {
    const flagged = await prisma.hostingOrder.updateMany({
      where: {
        id: order.id,
        status: { not: PaymentOrderStatus.PAID },
        OR: [{ failureReason: null }, { NOT: { failureReason: { startsWith: UNAPPLIED_PREFIX } } }],
      },
      data: { status: PaymentOrderStatus.CREATED, razorpayPaymentId, failureReason: `${UNAPPLIED_PREFIX}${reason}`.slice(0, 500) },
    });
    logger.error({ razorpayOrderId: order.razorpayOrderId, razorpayPaymentId, reason }, "Hosting payment received but not applied");
    if (flagged.count === 0) return;
    await notificationService
      .notifyAdmins({
        kind: "HOSTING_PAYMENT_ISSUE",
        title: `Hosting payment needs attention: ${formatInr(order.amountPaise)}`,
        body: `Razorpay payment ${razorpayPaymentId} (${order.packageName}, ${CYCLE_LABELS[order.cycle]}) was received but not applied. ${reason}`,
        link: order.websiteId ? `/websites/${order.websiteId}?tab=hosting` : "/admin/hosting?tab=payments",
        clientId: order.clientId,
      })
      .catch((error: unknown) => logger.error({ err: error }, "Hosting payment issue notice failed"));
  }
}

export const hostingCheckoutService = new HostingCheckoutService();
