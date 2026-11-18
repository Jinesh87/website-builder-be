import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { ShopOrderStatus, ShopRefundStatus } from "../../../generated/prisma/client.js";
import { recordOrderStatusEvent } from "../utils/shop-order-timeline.js";
import { releaseStockForOrder } from "../utils/shop-stock-hold.js";
import { shopCheckoutService } from "./shop-checkout.service.js";

type CancelledOrder = {
  id: string;
  number: number;
  websiteId: string;
  razorpayPaymentId: string | null;
  refundStatus: ShopRefundStatus;
  items: { variantId: string | null }[];
};

/**
 * After the store cancels an order (its stock is already back): releases checkout holds and refunds a paid order
 * in full. The admin confirms the refund in the UI before the status change is sent.
 */
export async function finishStoreCancel(
  websiteId: string,
  existing: CancelledOrder,
  actor: AuthUser,
  stockChanged: boolean,
): Promise<void> {
  await releaseStockForOrder(existing.websiteId, existing.id, existing.items);
  // A paid order cancelled by the store is refunded in full (the admin confirms this in the UI first).
  const refundable =
    !!existing.razorpayPaymentId &&
    (existing.refundStatus === ShopRefundStatus.NONE || existing.refundStatus === ShopRefundStatus.FAILED);
  if (refundable) {
    const refund = await shopCheckoutService.refundCapturedPayment(
      websiteId,
      existing.id,
      existing.razorpayPaymentId!,
      "Cancelled by store",
      "shop_merchant_cancel",
    );
    const note = refund.ok
      ? refund.refundStatus === ShopRefundStatus.PROCESSED
        ? "Cancelled by store; payment refunded"
        : "Cancelled by store; refund in progress"
      : "Cancelled by store; refund failed — retry from the order";
    await prisma.shopOrder.update({ where: { id: existing.id }, data: { failureReason: note } });
    await recordOrderStatusEvent(prisma, {
      orderId: existing.id,
      status: ShopOrderStatus.CANCELLED,
      actorType: "CLIENT",
      note,
      userId: actor.id,
    });
    if (!refund.ok) {
      logger.error({ websiteId, orderId: existing.id, paymentId: existing.razorpayPaymentId }, "Store cancel refund failed");
    }
  }
  logger.info({ websiteId, orderId: existing.id, number: existing.number, refunded: refundable, stockChanged }, "Shop order cancelled by store");

}
