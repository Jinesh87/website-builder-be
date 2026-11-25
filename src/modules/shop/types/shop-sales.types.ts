import type { PosPaymentMethodLabel } from "./shop-pos.types.js";

/** Totals for one channel (or both) over a report's days. */
export type SalesChannelTotals = {
  /** Paid orders that still stand (not cancelled, returned or failed). */
  ordersCount: number;
  revenuePaise: number;
  discountPaise: number;
  averagePaise: number;
  itemsSold: number;
  /** Revenue without GST, after discounts. */
  netSalesPaise: number;
  /** Base price × quantity of the items sold that have a base price. */
  costPaise: number;
  /** Net sales minus cost, over the items that have a base price. */
  profitPaise: number;
  /** Units sold whose product has no base price, so they are left out of cost and profit. */
  uncostedItems: number;
  /** Paid orders later cancelled. */
  cancelledCount: number;
  returnedCount: number;
  returnedPaise: number;
};

/** Online store and POS sales together for the IST days `from` through `to`. */
export type SalesSummary = {
  from: string;
  to: string;
  total: SalesChannelTotals;
  online: SalesChannelTotals;
  pos: SalesChannelTotals;
  /** Online orders by where they are in fulfilment. */
  fulfilment: { toFulfil: number; shipped: number; delivered: number };
  /** Revenue by how it was paid; online orders are all paid through Razorpay checkout. */
  byPayment: Record<"online" | PosPaymentMethodLabel, { count: number; totalPaise: number }>;
  /** Refunds Razorpay has processed for orders in this period. */
  refunds: { count: number; totalPaise: number };
};
