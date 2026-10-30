import { ShopOrderStatus } from "../../../generated/prisma/client.js";

export type ShopOrderEmailStatusLabel =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled";

export const SHOP_ORDER_EMAIL_STATUSES: ShopOrderEmailStatusLabel[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "failed",
  "cancelled",
];

export const STATUS_FROM_EMAIL_LABEL: Record<ShopOrderEmailStatusLabel, ShopOrderStatus> = {
  pending: ShopOrderStatus.PENDING,
  paid: ShopOrderStatus.PAID,
  processing: ShopOrderStatus.PROCESSING,
  shipped: ShopOrderStatus.SHIPPED,
  delivered: ShopOrderStatus.DELIVERED,
  failed: ShopOrderStatus.FAILED,
  cancelled: ShopOrderStatus.CANCELLED,
};

export const EMAIL_LABEL_FROM_STATUS: Record<ShopOrderStatus, ShopOrderEmailStatusLabel> = {
  [ShopOrderStatus.PENDING]: "pending",
  [ShopOrderStatus.PAID]: "paid",
  [ShopOrderStatus.PROCESSING]: "processing",
  [ShopOrderStatus.SHIPPED]: "shipped",
  [ShopOrderStatus.DELIVERED]: "delivered",
  [ShopOrderStatus.FAILED]: "failed",
  [ShopOrderStatus.CANCELLED]: "cancelled",
};

export const STATUS_DISPLAY: Record<ShopOrderEmailStatusLabel, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Placeholders shop owners can use in subject / title / message. */
export const SHOP_ORDER_EMAIL_PLACEHOLDERS = [
  "{{customerName}}",
  "{{orderNumber}}",
  "{{orderTotal}}",
  "{{orderDate}}",
  "{{shopName}}",
  "{{failureReason}}",
] as const;

export type DefaultTemplate = {
  subject: string;
  heading: string;
  /** Plain message. Separate paragraphs with a blank line. */
  message: string;
};

export const DEFAULT_SHOP_ORDER_EMAILS: Record<ShopOrderEmailStatusLabel, DefaultTemplate> = {
  pending: {
    subject: "Order #{{orderNumber}} received — {{shopName}}",
    heading: "We received your order",
    message:
      "Hi {{customerName}},\n\nThanks for shopping with {{shopName}}. We’ve received order #{{orderNumber}} and will update you as it moves along.",
  },
  paid: {
    subject: "Payment confirmed · Order #{{orderNumber}} — {{shopName}}",
    heading: "Payment confirmed",
    message:
      "Hi {{customerName}},\n\nWe’ve confirmed your payment for order #{{orderNumber}}. We’re getting it ready.",
  },
  processing: {
    subject: "Order #{{orderNumber}} is being prepared — {{shopName}}",
    heading: "Your order is being prepared",
    message:
      "Hi {{customerName}},\n\nGood news — order #{{orderNumber}} is now being prepared at {{shopName}}.",
  },
  shipped: {
    subject: "Order #{{orderNumber}} has shipped — {{shopName}}",
    heading: "Your order is on the way",
    message:
      "Hi {{customerName}},\n\nOrder #{{orderNumber}} has shipped. You’ll get another update when it’s delivered.",
  },
  delivered: {
    subject: "Order #{{orderNumber}} delivered — {{shopName}}",
    heading: "Delivered",
    message:
      "Hi {{customerName}},\n\nOrder #{{orderNumber}} has been marked as delivered. We hope you love it!",
  },
  failed: {
    subject: "Update on order #{{orderNumber}} — {{shopName}}",
    heading: "There was a problem with your order",
    message:
      "Hi {{customerName}},\n\nWe couldn’t complete order #{{orderNumber}}.\n\n{{failureReason}}\n\nIf money was taken, a refund will follow according to your payment method.",
  },
  cancelled: {
    subject: "Order #{{orderNumber}} cancelled — {{shopName}}",
    heading: "Order cancelled",
    message: "Hi {{customerName}},\n\nOrder #{{orderNumber}} has been cancelled.\n\n{{failureReason}}",
  },
};

