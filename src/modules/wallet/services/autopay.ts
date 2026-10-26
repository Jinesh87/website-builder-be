import { prisma } from "../../../config/prisma.js";
import { AutopayStatus, Prisma } from "../../../generated/prisma/client.js";
import {
  cancelRazorpaySubscription,
  createRazorpayPlan,
  fetchRazorpaySubscription,
  type RazorpayKeys,
  type RazorpayPlanPeriod,
  type RazorpaySubscription,
  type RazorpaySubscriptionStatus,
} from "./razorpay.client.js";

/** The mandate is approved and the next charge is on schedule. */
export const SCHEDULED_AUTOPAY: ReadonlySet<AutopayStatus> = new Set([AutopayStatus.AUTHENTICATED, AutopayStatus.ACTIVE]);

/** Razorpay will charge (or is retrying a charge). */
export const LIVE_AUTOPAY: ReadonlySet<AutopayStatus> = new Set([...SCHEDULED_AUTOPAY, AutopayStatus.PENDING]);

/** Could still charge, so it is shown as on and must be cancelled at Razorpay before it's replaced. */
export const STOPPABLE_AUTOPAY: ReadonlySet<AutopayStatus> = new Set([...LIVE_AUTOPAY, AutopayStatus.HALTED, AutopayStatus.PAUSED]);

/** Finished for good at Razorpay; nothing to cancel. */
export const ENDED_AUTOPAY: ReadonlySet<AutopayStatus> = new Set([
  AutopayStatus.CANCELLED,
  AutopayStatus.COMPLETED,
  AutopayStatus.EXPIRED,
]);

/** What Razorpay Checkout needs to approve a subscription (the autopay mandate). */
export type SubscriptionCheckout = {
  /** Passed to Checkout as `subscription_id`. */
  subscriptionId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  businessName: string;
  description: string;
  prefill: { name: string; email?: string; contact?: string };
  /** First charge; null = charged as soon as the mandate is approved. */
  startsAt: string | null;
};

export type SubscriptionConfirmation = { razorpaySubscriptionId: string; razorpayPaymentId: string; razorpaySignature: string };

/** Business name and the paying user's details for Checkout. */
export async function checkoutContact(
  clientId: string,
  userId: string,
): Promise<Pick<SubscriptionCheckout, "businessName" | "prefill">> {
  const [client, user] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { businessName: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true, email: true, phone: true } }),
  ]);
  return {
    businessName: client.businessName,
    prefill: {
      name: user.fullName,
      ...(user.email ? { email: user.email } : {}),
      ...(user.phone ? { contact: user.phone } : {}),
    },
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const STATUS: Record<RazorpaySubscriptionStatus, AutopayStatus> = {
  created: AutopayStatus.CREATED,
  authenticated: AutopayStatus.AUTHENTICATED,
  active: AutopayStatus.ACTIVE,
  pending: AutopayStatus.PENDING,
  halted: AutopayStatus.HALTED,
  paused: AutopayStatus.PAUSED,
  cancelled: AutopayStatus.CANCELLED,
  completed: AutopayStatus.COMPLETED,
  expired: AutopayStatus.EXPIRED,
};

/** Status and next charge to store from a subscription fetched from Razorpay. */
export function autopayState(subscription: RazorpaySubscription): { status: AutopayStatus; nextChargeAt: Date | null } {
  const status = STATUS[subscription.status] ?? AutopayStatus.CREATED;
  const chargeAt = subscription.charge_at ?? null;
  return { status, nextChargeAt: LIVE_AUTOPAY.has(status) && chargeAt ? new Date(chargeAt * 1000) : null };
}

export type PlanSpec = {
  period: RazorpayPlanPeriod;
  interval: number;
  itemName: string;
  amountPaise: number;
  currency: string;
};

/** The Razorpay plan for this price and interval, created on first use. Plans can't be edited, so a new price gets a new one. */
export async function razorpayPlanFor(keys: RazorpayKeys, spec: PlanSpec): Promise<string> {
  const itemName = spec.itemName.slice(0, 100);
  const key = { keyId: keys.keyId, period: spec.period, interval: spec.interval, amountPaise: spec.amountPaise, currency: spec.currency, itemName };
  const cached = await prisma.razorpayPlan.findUnique({ where: { keyId_period_interval_amountPaise_currency_itemName: key } });
  if (cached) return cached.razorpayPlanId;

  const plan = await createRazorpayPlan(keys, { ...spec, itemName });
  try {
    await prisma.razorpayPlan.create({ data: { ...key, razorpayPlanId: plan.id } });
  } catch (error) {
    // Another request cached the same plan first; this one still works.
    if (!isUniqueViolation(error)) throw error;
  }
  return plan.id;
}

/**
 * Cancels a subscription at Razorpay and returns its final state. One that already can't charge (never approved,
 * already cancelled or finished) refuses cancellation, which is fine: it is stopped either way.
 */
export async function stopRazorpaySubscription(keys: RazorpayKeys, subscriptionId: string): Promise<RazorpaySubscription> {
  try {
    return await cancelRazorpaySubscription(keys, subscriptionId);
  } catch (error) {
    const current = await fetchRazorpaySubscription(keys, subscriptionId);
    if (!STOPPABLE_AUTOPAY.has(autopayState(current).status)) return current;
    throw error;
  }
}
