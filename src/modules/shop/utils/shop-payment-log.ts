import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";

/** What happened with Razorpay; shown in the owner's Razorpay logs tab. */
export const PAYMENT_LOG_KINDS = ["order_created", "payment_verified", "payment_captured", "refund", "webhook"] as const;
export type PaymentLogKind = (typeof PAYMENT_LOG_KINDS)[number];

export type PaymentLogEntry = {
  websiteId: string;
  kind: PaymentLogKind;
  success: boolean;
  orderId?: string | null;
  /** Finds the order by its Razorpay order id when the shop order id isn't known (webhooks). */
  razorpayOrderId?: string | null;
  amountPaise?: number | null;
  razorpayRef?: string | null;
  message?: string | null;
};

const REFUND_REASONS: Record<string, string> = {
  shop_customer_cancel: "customer cancelled",
  shop_customer_return: "customer return",
  shop_merchant_cancel: "cancelled by the store",
  shop_merchant_return_refund: "return refunded by the store",
  shop_stock_unavailable: "out of stock after payment",
};

/** Why a refund was made, in words an owner understands. */
export function refundReasonLabel(purpose: string): string {
  return REFUND_REASONS[purpose] ?? purpose.replace(/^shop_/, "").replace(/_/g, " ");
}

/** The message an owner should see for a failed Razorpay call. */
export function razorpayErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Razorpay request failed.";
}

/** Records one Razorpay interaction. Never throws: logging must not break a checkout or refund. */
export async function recordPaymentLog(entry: PaymentLogEntry): Promise<void> {
  try {
    const [website, order] = await Promise.all([
      prisma.website.findUnique({ where: { id: entry.websiteId }, select: { clientId: true } }),
      entry.orderId
        ? prisma.shopOrder.findFirst({ where: { id: entry.orderId, websiteId: entry.websiteId }, select: { id: true, number: true } })
        : entry.razorpayOrderId
          ? prisma.shopOrder.findFirst({
              where: { razorpayOrderId: entry.razorpayOrderId, websiteId: entry.websiteId },
              select: { id: true, number: true },
            })
          : null,
    ]);
    if (!website) return;
    await prisma.shopPaymentLog.create({
      data: {
        websiteId: entry.websiteId,
        clientId: website.clientId,
        orderId: order?.id ?? entry.orderId ?? null,
        orderNumber: order?.number ?? null,
        kind: entry.kind,
        success: entry.success,
        amountPaise: entry.amountPaise ?? null,
        razorpayRef: entry.razorpayRef?.slice(0, 80) ?? null,
        message: entry.message?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    logger.warn({ err: error, websiteId: entry.websiteId, kind: entry.kind }, "Shop payment log not recorded");
  }
}

type WebhookEventSummary = {
  event?: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string | null; amount: number; error_description?: string | null } };
    refund?: { entity?: { id: string; amount?: number; status?: string } };
  };
};

/** Logs a Razorpay webhook the shop accepted, with the payment or refund it was about. */
export function logWebhookEvent(websiteId: string, event: WebhookEventSummary, handled: boolean): Promise<void> {
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const name = event.event || "unknown event";
  const failed = name === "payment.failed";
  const detail = failed && payment?.error_description ? `: ${payment.error_description}` : "";
  return recordPaymentLog({
    websiteId,
    kind: "webhook",
    success: !failed,
    razorpayOrderId: payment?.order_id ?? null,
    amountPaise: refund?.amount ?? payment?.amount ?? null,
    razorpayRef: refund?.id ?? payment?.id ?? null,
    message: `${name}${detail}${handled ? "" : " (no matching order change)"}`,
  });
}
