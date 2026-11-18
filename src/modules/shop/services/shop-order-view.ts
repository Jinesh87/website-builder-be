import { Prisma, ShopOrderStatus, type ShopRefundStatus } from "../../../generated/prisma/client.js";
import type { ShopRefundStatusLabel } from "../types/shop-auth.types.js";
import { toTimelineEvent, type ShopOrderTimelineEvent } from "../utils/shop-order-timeline.js";
import { refundStatusLabel } from "./shop-checkout.service.js";

/** Admin order lists show this many orders per page. */
export const ORDER_PAGE_SIZE = 20;

/** Relations every admin order view needs. */
export const ORDER_VIEW_INCLUDE = {
  customer: { select: { id: true, fullName: true, email: true, phone: true, isGuest: true } },
  items: { orderBy: { productName: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ShopOrderInclude;

export type ShopOrderStatusLabel =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled"
  | "returned";

export type ShopOrderItemView = {
  id: string;
  productName: string;
  variantName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type ShopOrderView = {
  id: string;
  number: string;
  status: ShopOrderStatusLabel;
  refundStatus: ShopRefundStatusLabel;
  totalPaise: number;
  currency: "INR";
  couponId: string | null;
  couponCode: string | null;
  listAmountPaise: number | null;
  discountPaise: number | null;
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    isGuest: boolean;
  };
  items: ShopOrderItemView[];
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  paidAt: string | null;
  /** Set while the order's items are taken out of stock; cancelling puts them back. */
  stockDeductedAt: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  cancelReason: string | null;
  returnReason: string | null;
  shippingAddress: {
    label: string | null;
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  timeline: ShopOrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ShopOrderPage = {
  orders: ShopOrderView[];
  page: number;
  pageSize: number;
  total: number;
};

export const STATUS_FROM_LABEL: Record<ShopOrderStatusLabel, ShopOrderStatus> = {
  pending: ShopOrderStatus.PENDING,
  paid: ShopOrderStatus.PAID,
  processing: ShopOrderStatus.PROCESSING,
  shipped: ShopOrderStatus.SHIPPED,
  delivered: ShopOrderStatus.DELIVERED,
  failed: ShopOrderStatus.FAILED,
  cancelled: ShopOrderStatus.CANCELLED,
  returned: ShopOrderStatus.RETURNED,
};

export const LABEL_FROM_STATUS: Record<ShopOrderStatus, ShopOrderStatusLabel> = {
  [ShopOrderStatus.PENDING]: "pending",
  [ShopOrderStatus.PAID]: "paid",
  [ShopOrderStatus.PROCESSING]: "processing",
  [ShopOrderStatus.SHIPPED]: "shipped",
  [ShopOrderStatus.DELIVERED]: "delivered",
  [ShopOrderStatus.FAILED]: "failed",
  [ShopOrderStatus.CANCELLED]: "cancelled",
  [ShopOrderStatus.RETURNED]: "returned",
};

function parseShippingAddress(value: Prisma.JsonValue | null | undefined): ShopOrderView["shippingAddress"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : "");
  const fullName = text("fullName");
  const line1 = text("line1");
  const city = text("city");
  if (!fullName || !line1 || !city) return null;
  return {
    label: typeof row.label === "string" ? row.label : null,
    fullName,
    phone: text("phone"),
    line1,
    line2: typeof row.line2 === "string" ? row.line2 : null,
    city,
    state: text("state"),
    postalCode: text("postalCode"),
    country: text("country") || "IN",
  };
}

export function toView(order: {
  id: string;
  number: number;
  status: ShopOrderStatus;
  refundStatus: ShopRefundStatus;
  totalPaise: number;
  couponId?: string | null;
  couponCode?: string | null;
  listAmountPaise?: number | null;
  discountPaise?: number | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  paidAt: Date | null;
  stockDeductedAt: Date | null;
  refundedAt: Date | null;
  failureReason: string | null;
  cancelReason: string | null;
  returnReason: string | null;
  shippingAddress?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; fullName: string; email: string; phone: string | null; isGuest: boolean };
  items: {
    id: string;
    productName: string;
    variantName: string;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }[];
  events?: {
    id: string;
    status: ShopOrderStatus;
    actorType: string;
    note: string | null;
    createdAt: Date;
  }[];
}): ShopOrderView {
  return {
    id: order.id,
    number: String(order.number),
    status: LABEL_FROM_STATUS[order.status],
    refundStatus: refundStatusLabel(order.refundStatus),
    totalPaise: order.totalPaise,
    currency: "INR",
    couponId: order.couponId ?? null,
    couponCode: order.couponCode ?? null,
    listAmountPaise: order.listAmountPaise ?? null,
    discountPaise: order.discountPaise ?? null,
    customer: {
      id: order.customer.id,
      fullName: order.customer.fullName,
      email: order.customer.email,
      phone: order.customer.phone,
      isGuest: order.customer.isGuest,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise: item.lineTotalPaise,
    })),
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    razorpayRefundId: order.razorpayRefundId,
    paidAt: order.paidAt?.toISOString() ?? null,
    stockDeductedAt: order.stockDeductedAt?.toISOString() ?? null,
    refundedAt: order.refundedAt?.toISOString() ?? null,
    failureReason: order.failureReason,
    cancelReason: order.cancelReason,
    returnReason: order.returnReason,
    shippingAddress: parseShippingAddress(order.shippingAddress),
    timeline: (order.events ?? []).map(toTimelineEvent),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
