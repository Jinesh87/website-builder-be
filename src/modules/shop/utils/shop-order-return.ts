import { ShopOrderStatus } from "../../../generated/prisma/client.js";

export type ReturnProductPolicy = {
  returnsEnabled: boolean;
  returnDays: number | null;
};

/** Effective return window for one product. Null = returns not offered. */
export function effectiveReturnDays(
  shopReturnDays: number | null | undefined,
  product: ReturnProductPolicy | null | undefined,
): number | null {
  if (!shopReturnDays || shopReturnDays < 1) return null;
  if (product && product.returnsEnabled === false) return null;
  const days = product?.returnDays ?? shopReturnDays;
  return days > 0 ? days : null;
}

/**
 * Whole-order return window: every line must allow returns; window is the shortest
 * of those line windows. Missing products fall back to the shop default.
 */
export function orderReturnWindowDays(
  shopReturnDays: number | null | undefined,
  lineProducts: Array<ReturnProductPolicy | null | undefined>,
): number | null {
  if (!shopReturnDays || shopReturnDays < 1) return null;
  if (lineProducts.length === 0) return shopReturnDays;
  const windows = lineProducts.map((product) => effectiveReturnDays(shopReturnDays, product));
  if (windows.some((days) => days == null)) return null;
  return Math.min(...(windows as number[]));
}

export function deliveredAtFromEvents(
  events: Array<{ status: ShopOrderStatus; createdAt: Date }>,
): Date | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.status === ShopOrderStatus.DELIVERED) return event.createdAt;
  }
  return null;
}

export function returnDeadline(deliveredAt: Date, days: number): Date {
  return new Date(deliveredAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function canCustomerReturnOrder(input: {
  status: ShopOrderStatus;
  deliveredAt: Date | null;
  shopReturnDays: number | null | undefined;
  lineProducts: Array<ReturnProductPolicy | null | undefined>;
  now?: Date;
}): boolean {
  if (input.status !== ShopOrderStatus.DELIVERED) return false;
  if (!input.deliveredAt) return false;
  const days = orderReturnWindowDays(input.shopReturnDays, input.lineProducts);
  if (!days) return false;
  const now = input.now ?? new Date();
  return now.getTime() <= returnDeadline(input.deliveredAt, days).getTime();
}
