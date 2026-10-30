import { ShopOrderStatus } from "../../../generated/prisma/client.js";

/** Fulfilment statuses shoppers may be allowed to cancel through (inclusive). */
export const SHOP_CANCEL_UNTIL_STATUSES = [
  ShopOrderStatus.PAID,
  ShopOrderStatus.PROCESSING,
  ShopOrderStatus.SHIPPED,
] as const;

export type ShopCancelUntilStatus = (typeof SHOP_CANCEL_UNTIL_STATUSES)[number];

export type ShopCancelUntilStatusLabel = "paid" | "processing" | "shipped";

const RANK: Partial<Record<ShopOrderStatus, number>> = {
  [ShopOrderStatus.PENDING]: 0,
  [ShopOrderStatus.PAID]: 1,
  [ShopOrderStatus.PROCESSING]: 2,
  [ShopOrderStatus.SHIPPED]: 3,
};

export const CANCEL_UNTIL_FROM_LABEL: Record<ShopCancelUntilStatusLabel, ShopCancelUntilStatus> = {
  paid: ShopOrderStatus.PAID,
  processing: ShopOrderStatus.PROCESSING,
  shipped: ShopOrderStatus.SHIPPED,
};

export const CANCEL_UNTIL_TO_LABEL: Record<ShopCancelUntilStatus, ShopCancelUntilStatusLabel> = {
  [ShopOrderStatus.PAID]: "paid",
  [ShopOrderStatus.PROCESSING]: "processing",
  [ShopOrderStatus.SHIPPED]: "shipped",
};

export function isShopCancelUntilStatus(value: ShopOrderStatus | null | undefined): value is ShopCancelUntilStatus {
  return value === ShopOrderStatus.PAID || value === ShopOrderStatus.PROCESSING || value === ShopOrderStatus.SHIPPED;
}

export function cancelUntilLabel(status: ShopOrderStatus | null | undefined): ShopCancelUntilStatusLabel | null {
  if (!isShopCancelUntilStatus(status)) return null;
  return CANCEL_UNTIL_TO_LABEL[status];
}

/**
 * Shopper may cancel when the order's current status ranks at or below the policy cutoff.
 * PENDING is always allowed when any cancel policy is set (it ranks before PAID).
 */
export function canCustomerCancelOrder(
  orderStatus: ShopOrderStatus,
  cancelUntilStatus: ShopOrderStatus | null | undefined,
): boolean {
  if (!isShopCancelUntilStatus(cancelUntilStatus)) return false;
  const orderRank = RANK[orderStatus];
  const untilRank = RANK[cancelUntilStatus];
  if (orderRank === undefined || untilRank === undefined) return false;
  return orderRank <= untilRank;
}
