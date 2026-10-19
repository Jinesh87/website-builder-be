import { randomBytes } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  PaymentOrderStatus,
  WalletTransactionSource,
  WalletTransactionType,
  type Prisma,
  type WalletTransaction,
} from "../../../generated/prisma/client.js";
import { paymentSettingsService } from "./payment-settings.service.js";
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayPayment,
  isValidPaymentSignature,
  isValidWebhookSignature,
} from "./razorpay.client.js";

export const PAYMENT_CURRENCY = "INR";
export const CONNECTS_PER_RUPEE = 3;
/** Connects are sold in multiples of this. */
export const CONNECTS_PACK_SIZE = 50;
export const MIN_PURCHASE_CONNECTS = CONNECTS_PACK_SIZE;
export const MAX_PURCHASE_CONNECTS = 300_000;

type Tx = Prisma.TransactionClient;

export type WalletTransactionView = {
  id: string;
  type: WalletTransactionType;
  source: WalletTransactionSource;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type WalletView = {
  balance: number;
  paymentsEnabled: boolean;
  connectsPerRupee: number;
  packSize: number;
  minPurchase: number;
  maxPurchase: number;
  /** Connects required before AI features. 0 means any balance above zero. */
  minAiBalance: number;
};

export type TopupCheckout = {
  /** Razorpay order id, passed to Checkout as `order_id`. */
  orderId: string;
  keyId: string;
  connects: number;
  amountPaise: number;
  currency: string;
  businessName: string;
  prefill: { name: string; email?: string; contact?: string };
};

export type LedgerEntry = {
  type: WalletTransactionType;
  source: WalletTransactionSource;
  /** Connects, to a thousandth. */
  amount: number;
  description: string;
  userId?: string | null;
  paymentOrderId?: string;
  /** For charges after the fact (AI usage): the cost is already incurred, so the balance may go below zero. */
  allowNegative?: boolean;
};

function toTransactionView(row: WalletTransaction): WalletTransactionView {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    amount: Number(row.amount),
    balanceAfter: Number(row.balanceAfter),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Rounds to the thousandth of a connect the ledger stores, as a string so no float error reaches the database. */
function toConnectsDecimal(amount: number): string {
  return (Math.round(amount * 1000) / 1000).toFixed(3);
}

/** Price of a purchase, rounded to the nearest paisa: 50 connects = ₹16.67, 150 = ₹50. */
export function priceInPaise(connects: number): number {
  return Math.round((connects * 100) / CONNECTS_PER_RUPEE);
}

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0 })}`;
}

export function formatConnects(connects: number): string {
  return `${connects.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${connects === 1 ? "connect" : "connects"}`;
}

/**
 * Moves connects in or out of a client's wallet and records it in the ledger, in the caller's transaction.
 * Debits fail with INSUFFICIENT_BALANCE rather than go below zero, unless `allowNegative` is set.
 */
export async function applyLedgerEntry(tx: Tx, clientId: string, entry: LedgerEntry): Promise<WalletTransaction> {
  const amount = toConnectsDecimal(entry.amount);
  if (!Number.isFinite(entry.amount) || Number(amount) <= 0) {
    throw new AppError(400, "Amount must be a positive number of connects.", "VALIDATION_ERROR");
  }
  let wallet;
  if (entry.type === WalletTransactionType.CREDIT) {
    wallet = await tx.wallet.upsert({
      where: { clientId },
      create: { clientId, balance: amount },
      update: { balance: { increment: amount } },
    });
  } else if (entry.allowNegative) {
    wallet = await tx.wallet.upsert({
      where: { clientId },
      create: { clientId, balance: `-${amount}` },
      update: { balance: { decrement: amount } },
    });
  } else {
    const debited = await tx.wallet.updateMany({
      where: { clientId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (debited.count === 0) {
      throw new AppError(402, "You don't have enough connects. Please buy more to continue.", "INSUFFICIENT_BALANCE");
    }
    wallet = await tx.wallet.findUniqueOrThrow({ where: { clientId } });
  }
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: entry.type,
      source: entry.source,
      amount,
      balanceAfter: wallet.balance,
      description: entry.description.slice(0, 300),
      userId: entry.userId ?? null,
      paymentOrderId: entry.paymentOrderId,
    },
  });
}

export class WalletService {
  async getWallet(clientId: string): Promise<WalletView> {
    const [wallet, paymentsEnabled, billing] = await Promise.all([
      prisma.wallet.findUnique({ where: { clientId } }),
      paymentSettingsService.isConfigured(),
      prisma.billingConfig.findUnique({ where: { id: "default" }, select: { minAiBalance: true } }),
    ]);
    return {
      balance: Number(wallet?.balance ?? 0),
      paymentsEnabled,
      connectsPerRupee: CONNECTS_PER_RUPEE,
      packSize: CONNECTS_PACK_SIZE,
      minPurchase: MIN_PURCHASE_CONNECTS,
      maxPurchase: MAX_PURCHASE_CONNECTS,
      minAiBalance: Number(billing?.minAiBalance ?? 0),
    };
  }

  async listTransactions(clientId: string, page: number, pageSize: number) {
    const where = { wallet: { clientId } };
    const [rows, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    return { transactions: rows.map(toTransactionView), total, page, pageSize };
  }

  /** Credits connects; for purchases and future refunds or adjustments. */
  credit(clientId: string, entry: Omit<LedgerEntry, "type">): Promise<WalletTransaction> {
    return prisma.$transaction((tx) => applyLedgerEntry(tx, clientId, { ...entry, type: WalletTransactionType.CREDIT }));
  }

  /** Debits connects (e.g. AI usage); throws INSUFFICIENT_BALANCE (402) rather than going below zero. */
  debit(clientId: string, entry: Omit<LedgerEntry, "type">): Promise<WalletTransaction> {
    return prisma.$transaction((tx) => applyLedgerEntry(tx, clientId, { ...entry, type: WalletTransactionType.DEBIT }));
  }

  async createTopup(clientId: string, userId: string, connects: number): Promise<TopupCheckout> {
    if (
      !Number.isInteger(connects) ||
      connects % CONNECTS_PACK_SIZE !== 0 ||
      connects < MIN_PURCHASE_CONNECTS ||
      connects > MAX_PURCHASE_CONNECTS
    ) {
      throw new AppError(
        400,
        `Buy connects in multiples of ${CONNECTS_PACK_SIZE}, between ${formatConnects(MIN_PURCHASE_CONNECTS)} and ${formatConnects(MAX_PURCHASE_CONNECTS)}.`,
        "VALIDATION_ERROR",
      );
    }
    const amountPaise = priceInPaise(connects);
    const keys = await paymentSettingsService.getKeys();
    const [client, user] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { businessName: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true, email: true, phone: true } }),
    ]);
    const order = await createRazorpayOrder(keys, {
      amountPaise,
      currency: PAYMENT_CURRENCY,
      receipt: `connects_${randomBytes(8).toString("hex")}`,
      notes: { purpose: "connects_purchase", connects: String(connects), clientId, userId },
    });
    await prisma.paymentOrder.create({
      data: { clientId, userId, razorpayOrderId: order.id, connects, amountPaise, currency: PAYMENT_CURRENCY },
    });
    return {
      orderId: order.id,
      keyId: keys.keyId,
      connects,
      amountPaise,
      currency: PAYMENT_CURRENCY,
      businessName: client.businessName,
      prefill: {
        name: user.fullName,
        ...(user.email ? { email: user.email } : {}),
        ...(user.phone ? { contact: user.phone } : {}),
      },
    };
  }

  /** Called by the browser after Razorpay Checkout succeeds; the webhook is the backup if this never arrives. */
  async confirmTopup(
    clientId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ): Promise<{ wallet: WalletView; transaction: WalletTransactionView | null }> {
    const order = await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: input.razorpayOrderId } });
    if (!order || order.clientId !== clientId) throw new AppError(404, "Payment not found.", "NOT_FOUND");

    const keys = await paymentSettingsService.getKeys();
    if (!isValidPaymentSignature(keys.keySecret, input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      throw new AppError(400, "We couldn't verify this payment. If money was taken, your connects will be added automatically.", "PAYMENT_VERIFICATION_FAILED");
    }

    let payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.amountPaise || payment.currency !== order.currency) {
      throw new AppError(400, "This payment doesn't match the purchase.", "PAYMENT_VERIFICATION_FAILED");
    }
    if (payment.status === "authorized") {
      payment = await captureRazorpayPayment(keys, payment.id, order.amountPaise, order.currency);
    }
    if (payment.status !== "captured") {
      throw new AppError(400, "The payment hasn't completed yet. Your connects are added as soon as it does.", "PAYMENT_PENDING");
    }

    const transaction = await this.markPaid(order.razorpayOrderId, payment.id, payment.amount);
    return { wallet: await this.getWallet(clientId), transaction: transaction && toTransactionView(transaction) };
  }

  /**
   * Credits a paid order exactly once, however many times it's reported (checkout callback, webhook retries).
   * Returns the ledger row when this call credited the wallet, null when it already had been.
   */
  async markPaid(razorpayOrderId: string, razorpayPaymentId: string, amountPaise: number): Promise<WalletTransaction | null> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({ where: { razorpayOrderId } });
      if (!order) throw new AppError(404, "Payment not found.", "NOT_FOUND");
      if (amountPaise !== order.amountPaise) {
        throw new AppError(400, "Paid amount doesn't match the order.", "PAYMENT_VERIFICATION_FAILED");
      }
      const claimed = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: { not: PaymentOrderStatus.PAID } },
        data: { status: PaymentOrderStatus.PAID, razorpayPaymentId, paidAt: new Date(), failureReason: null },
      });
      if (claimed.count === 0) return null;
      return applyLedgerEntry(tx, order.clientId, {
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.TOPUP,
        amount: order.connects,
        description: `Bought ${formatConnects(order.connects)} for ${formatInr(order.amountPaise)}`,
        userId: order.userId,
        paymentOrderId: order.id,
      });
    });
  }

  /** Razorpay webhook: `payment.captured` / `order.paid` credit the wallet, `payment.failed` records the reason. */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const secret = await paymentSettingsService.getWebhookSecret();
    if (!secret) throw new AppError(503, "Webhook secret isn't configured.", "PAYMENTS_NOT_CONFIGURED");
    if (!signature || !isValidWebhookSignature(secret, rawBody, signature)) {
      throw new AppError(400, "Invalid webhook signature.", "INVALID_SIGNATURE");
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: { payment?: { entity?: { id: string; order_id: string | null; amount: number; error_description?: string | null } } };
    };
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) return;
    const known = await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: payment.order_id }, select: { id: true } });
    if (!known) return;

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const credited = await this.markPaid(payment.order_id, payment.id, payment.amount);
      if (credited) logger.info({ razorpayOrderId: payment.order_id }, "connects purchase credited from webhook");
    } else if (event.event === "payment.failed") {
      await prisma.paymentOrder.updateMany({
        where: { razorpayOrderId: payment.order_id, status: PaymentOrderStatus.CREATED },
        data: { status: PaymentOrderStatus.FAILED, failureReason: payment.error_description?.slice(0, 500) ?? "Payment failed" },
      });
    }
  }
}

export const walletService = new WalletService();
