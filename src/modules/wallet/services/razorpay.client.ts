import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayKeys = { keyId: string; keySecret: string };

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string | null; status: string };

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  error_description?: string | null;
};

export type RazorpayPlanPeriod = "monthly" | "yearly";

export type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "paused"
  | "cancelled"
  | "completed"
  | "expired";

/** Times are Unix seconds. */
export type RazorpaySubscription = {
  id: string;
  plan_id: string;
  status: RazorpaySubscriptionStatus;
  charge_at: number | null;
  start_at: number | null;
  current_end: number | null;
  paid_count: number;
};

async function call<T>(keys: RazorpayKeys, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError(502, "Couldn't reach Razorpay. Please try again.", "PAYMENT_GATEWAY_UNAVAILABLE");
  }
  const json = (await response.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!response.ok) {
    if (response.status === 401) {
      throw new AppError(502, "Razorpay rejected the API keys. Check the payment settings.", "PAYMENT_GATEWAY_AUTH");
    }
    throw new AppError(502, json.error?.description || "Razorpay couldn't process the request.", "PAYMENT_GATEWAY_ERROR");
  }
  return json;
}

export function createRazorpayOrder(
  keys: RazorpayKeys,
  input: { amountPaise: number; currency: string; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  return call(keys, "POST", "/orders", {
    amount: input.amountPaise,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });
}

export function fetchRazorpayPayment(keys: RazorpayKeys, paymentId: string): Promise<RazorpayPayment> {
  return call(keys, "GET", `/payments/${encodeURIComponent(paymentId)}`);
}

export function captureRazorpayPayment(
  keys: RazorpayKeys,
  paymentId: string,
  amountPaise: number,
  currency: string,
): Promise<RazorpayPayment> {
  return call(keys, "POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency });
}

export type RazorpayRefund = {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
};

/** Full refund when `amountPaise` is omitted. Only works on captured payments. */
export function createRazorpayRefund(
  keys: RazorpayKeys,
  paymentId: string,
  input: { amountPaise?: number; notes?: Record<string, string>; receipt?: string } = {},
): Promise<RazorpayRefund> {
  return call(keys, "POST", `/payments/${encodeURIComponent(paymentId)}/refund`, {
    ...(input.amountPaise !== undefined ? { amount: input.amountPaise } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.receipt ? { receipt: input.receipt } : {}),
  });
}

export function createRazorpayPlan(
  keys: RazorpayKeys,
  input: { period: RazorpayPlanPeriod; interval: number; itemName: string; amountPaise: number; currency: string },
): Promise<{ id: string }> {
  return call(keys, "POST", "/plans", {
    period: input.period,
    interval: input.interval,
    item: { name: input.itemName, amount: input.amountPaise, currency: input.currency },
  });
}

/** Without `startAt` the first charge is taken when the customer approves the mandate. */
export function createRazorpaySubscription(
  keys: RazorpayKeys,
  input: { planId: string; totalCount: number; startAt?: Date; notes: Record<string, string> },
): Promise<RazorpaySubscription> {
  return call(keys, "POST", "/subscriptions", {
    plan_id: input.planId,
    total_count: input.totalCount,
    customer_notify: 1,
    ...(input.startAt ? { start_at: Math.floor(input.startAt.getTime() / 1000) } : {}),
    notes: input.notes,
  });
}

export function fetchRazorpaySubscription(keys: RazorpayKeys, subscriptionId: string): Promise<RazorpaySubscription> {
  return call(keys, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/** Stops it straight away; what was already paid is not refunded. */
export function cancelRazorpaySubscription(keys: RazorpayKeys, subscriptionId: string): Promise<RazorpaySubscription> {
  return call(keys, "POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { cancel_at_cycle_end: 0 });
}

/** Cheap authenticated call used to check keys before saving them. */
export async function checkRazorpayKeys(keys: RazorpayKeys): Promise<void> {
  await call(keys, "GET", "/orders?count=1");
}

function safeEqualHex(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature Razorpay Checkout returns after a successful payment. */
export function isValidPaymentSignature(keySecret: string, orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Signature Razorpay Checkout returns after the customer approves a subscription. Note the order: payment first. */
export function isValidSubscriptionSignature(keySecret: string, paymentId: string, subscriptionId: string, signature: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** `X-Razorpay-Signature` on webhooks: HMAC of the raw request body with the webhook secret. */
export function isValidWebhookSignature(webhookSecret: string, rawBody: Buffer, signature: string): boolean {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
