import type { HostingPayer, HostingPaymentMethod } from "../../../generated/prisma/enums.js";

/** How a plan renews by itself, if it does. */
export type AutoRenewal = "CONNECTS" | "AUTOPAY" | null;

export type AutopayStopReason = "PAYMENT_FAILED" | "STOPPED" | "PLAN_CHANGED";

export type HostingEvent =
  | {
      kind: "RENEWAL_REMINDER";
      periodEnd: Date;
      /** Paise; null when the plan has no payable price yet. */
      price: number | null;
      renewsBy: AutoRenewal;
    }
  | {
      kind: "PAID";
      periodStart: Date;
      periodEnd: Date;
      packageName: string | null;
      amountPaise: number;
      connects: number | null;
      method: HostingPaymentMethod;
      paidBy: HostingPayer;
      restored: boolean;
    }
  | { kind: "EXPIRED"; graceEndsAt: Date; price: number | null }
  | { kind: "SUSPENDED" }
  | { kind: "AUTOPAY_STOPPED"; reason: AutopayStopReason };
