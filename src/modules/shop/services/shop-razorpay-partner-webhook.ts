import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { isValidWebhookSignature } from "../../wallet/services/razorpay.client.js";
import { razorpayPartnerSettingsService } from "../../wallet/services/razorpay-partner-settings.service.js";
import type { RazorpayWebhookEvent } from "../../wallet/services/wallet.service.js";
import { logWebhookEvent } from "../utils/shop-payment-log.js";
import { shopCheckoutService } from "./shop-checkout.service.js";
import { CLEARED_OAUTH } from "./shop-razorpay-auth.js";

/** Partner webhooks name the connected Razorpay account they are about. */
type PartnerWebhookEvent = RazorpayWebhookEvent & {
  account_id?: string;
  payload?: RazorpayWebhookEvent["payload"] & { order?: { entity?: { id?: string } } };
};

/** The shop an event belongs to, found from the Razorpay order or payment it mentions. */
async function shopFor(event: PartnerWebhookEvent): Promise<string | null> {
  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id ?? null;
  const razorpayPaymentId = event.payload?.refund?.entity?.payment_id ?? payment?.id ?? null;
  const or = [
    ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
    ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
  ];
  if (or.length === 0) return null;
  const order = await prisma.shopOrder.findFirst({ where: { OR: or }, select: { websiteId: true } });
  if (!order) return null;
  // The event must come from the account this shop is connected to.
  if (event.account_id) {
    const config = await prisma.shopPaymentConfig.findUnique({ where: { websiteId: order.websiteId }, select: { razorpayAccountId: true } });
    if (config?.razorpayAccountId !== event.account_id) return null;
  }
  return order.websiteId;
}

/**
 * One webhook for every shop connected through the partner app, set once on the partner dashboard.
 * Unknown events are acknowledged so Razorpay doesn't keep retrying them.
 */
export async function handleShopPartnerWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  const secret = await razorpayPartnerSettingsService.getWebhookSecret();
  if (!signature || !secret || !isValidWebhookSignature(secret, rawBody, signature)) {
    logger.warn({ hasSecret: Boolean(secret) }, "Razorpay partner webhook rejected: bad signature");
    throw new AppError(400, "Invalid Razorpay signature", "WEBHOOK_SIGNATURE_INVALID");
  }
  let event: PartnerWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8")) as PartnerWebhookEvent;
  } catch {
    throw new AppError(400, "Invalid Razorpay webhook body", "WEBHOOK_BODY_INVALID");
  }

  if (event.event === "account.app.authorization_revoked") {
    if (!event.account_id) return;
    const cleared = await prisma.shopPaymentConfig.updateMany({ where: { razorpayAccountId: event.account_id }, data: CLEARED_OAUTH });
    logger.info({ accountId: event.account_id, shops: cleared.count }, "Razorpay access revoked by the merchant");
    return;
  }

  const websiteId = await shopFor(event);
  if (!websiteId) {
    logger.info({ event: event.event, accountId: event.account_id }, "Razorpay partner webhook: no matching shop order");
    return;
  }
  const handled = await shopCheckoutService.applyWebhook(websiteId, event);
  await logWebhookEvent(websiteId, event, handled);
  logger.info({ websiteId, event: event.event, handled }, "Razorpay partner webhook accepted");
}
