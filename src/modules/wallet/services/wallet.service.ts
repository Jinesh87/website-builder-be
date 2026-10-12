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

export const WALLET_CURRENCY = "INR";
export const MIN_TOPUP_PAISE = 10 * 100;
export const MAX_TOPUP_PAISE = 100_000 * 100;

type Tx = Prisma.TransactionClient;

export type WalletTransactionView = {
  id: string;
  type: WalletTransactionType;
  source: WalletTransactionSource;
  amountPaise: number;
  balanceAfterPaise: number;
  description: string;
  createdAt: string;
};

export type WalletView = {
  balancePaise: number;
  currency: string;
  paymentsEnabled: boolean;
  minTopupPaise: number;
  maxTopupPaise: number;
};

export type TopupCheckout = {
  /** Razorpay order id, passed to Checkout as `order_id`. */
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  businessName: string;
  prefill: { name: string; email: string; contact?: string };
};

export type LedgerEntry = {
  type: WalletTransactionType;
  source: WalletTransactionSource;
  amountPaise: number;
  description: string;
  userId?: string | null;
  paymentOrderId?: string;
};

function toTransactionView(row: WalletTransaction): WalletTransactionView {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    amountPaise: row.amountPaise,
    balanceAfterPaise: row.balanceAfterPaise,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0 })}`;
}

/**
 * Moves money in or out of a client's wallet and records it in the ledger, in the caller's transaction.
 * Debits never take the balance below zero: they fail with INSUFFICIENT_BALANCE instead.
 */
async function applyEntry(tx: Tx, clientId: string, entry: LedgerEntry): Promise<WalletTransaction> {
  if (!Number.isInteger(entry.amountPaise) || entry.amountPaise <= 0) {
    throw new AppError(400, "Amount must be a positive whole number of paise.", "VALIDATION_ERROR");
  }
  let wallet;
  if (entry.type === WalletTransactionType.CREDIT) {
    wallet = await tx.wallet.upsert({
      where: { clientId },
      create: { clientId, balancePaise: entry.amountPaise, currency: WALLET_CURRENCY },
      update: { balancePaise: { increment: entry.amountPaise } },
    });
  } else {
    const debited = await tx.wallet.updateMany({
      where: { clientId, balancePaise: { gte: entry.amountPaise } },
      data: { balancePaise: { decrement: entry.amountPaise } },
    });
    if (debited.count === 0) {
      throw new AppError(402, "Your wallet balance is too low. Please add money to continue.", "INSUFFICIENT_BALANCE");
    }
    wallet = await tx.wallet.findUniqueOrThrow({ where: { clientId } });
  }
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: entry.type,
      source: entry.source,
      amountPaise: entry.amountPaise,
      balanceAfterPaise: wallet.balancePaise,
      description: entry.description.slice(0, 300),
      userId: entry.userId ?? null,
      paymentOrderId: entry.paymentOrderId,
    },
  });
}

export class WalletService {
  async getWallet(clientId: string): Promise<WalletView> {
    const [wallet, paymentsEnabled] = await Promise.all([
      prisma.wallet.findUnique({ where: { clientId } }),
      paymentSettingsService.isConfigured(),
    ]);
    return {
      balancePaise: wallet?.balancePaise ?? 0,
      currency: wallet?.currency ?? WALLET_CURRENCY,
      paymentsEnabled,
      minTopupPaise: MIN_TOPUP_PAISE,
      maxTopupPaise: MAX_TOPUP_PAISE,
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

  /** Credits the wallet; for top-ups and future refunds or adjustments. */
  credit(clientId: string, entry: Omit<LedgerEntry, "type">): Promise<WalletTransaction> {
    return prisma.$transaction((tx) => applyEntry(tx, clientId, { ...entry, type: WalletTransactionType.CREDIT }));
  }

  /** Debits the wallet (e.g. AI usage); throws INSUFFICIENT_BALANCE (402) rather than going below zero. */
  debit(clientId: string, entry: Omit<LedgerEntry, "type">): Promise<WalletTransaction> {
    return prisma.$transaction((tx) => applyEntry(tx, clientId, { ...entry, type: WalletTransactionType.DEBIT }));
  }

  async createTopup(clientId: string, userId: string, amountPaise: number): Promise<TopupCheckout> {
    if (!Number.isInteger(amountPaise) || amountPaise < MIN_TOPUP_PAISE || amountPaise > MAX_TOPUP_PAISE) {
      throw new AppError(
        400,
        `Enter an amount between ${formatInr(MIN_TOPUP_PAISE)} and ${formatInr(MAX_TOPUP_PAISE)}.`,
        "VALIDATION_ERROR",
      );
    }
    const keys = await paymentSettingsService.getKeys();
    const [client, user] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { businessName: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true, email: true, phone: true } }),
    ]);
    const order = await createRazorpayOrder(keys, {
      amountPaise,
      currency: WALLET_CURRENCY,
      receipt: `wallet_${randomBytes(8).toString("hex")}`,
      notes: { purpose: "wallet_topup", clientId, userId },
    });
    await prisma.paymentOrder.create({
      data: { clientId, userId, razorpayOrderId: order.id, amountPaise, currency: WALLET_CURRENCY },
    });
    return {
      orderId: order.id,
      keyId: keys.keyId,
      amountPaise,
      currency: WALLET_CURRENCY,
      businessName: client.businessName,
      prefill: { name: user.fullName, email: user.email, ...(user.phone ? { contact: user.phone } : {}) },
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
      throw new AppError(400, "We couldn't verify this payment. If money was taken, it will be added automatically.", "PAYMENT_VERIFICATION_FAILED");
    }

    let payment = await fetchRazorpayPayment(keys, input.razorpayPaymentId);
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.amountPaise || payment.currency !== order.currency) {
      throw new AppError(400, "This payment doesn't match the top-up.", "PAYMENT_VERIFICATION_FAILED");
    }
    if (payment.status === "authorized") {
      payment = await captureRazorpayPayment(keys, payment.id, order.amountPaise, order.currency);
    }
    if (payment.status !== "captured") {
      throw new AppError(400, "The payment hasn't completed yet. Your balance updates as soon as it does.", "PAYMENT_PENDING");
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
      return applyEntry(tx, order.clientId, {
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.TOPUP,
        amountPaise: order.amountPaise,
        description: `Added ${formatInr(order.amountPaise)} via Razorpay`,
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
      if (credited) logger.info({ razorpayOrderId: payment.order_id }, "wallet top-up credited from webhook");
    } else if (event.event === "payment.failed") {
      await prisma.paymentOrder.updateMany({
        where: { razorpayOrderId: payment.order_id, status: PaymentOrderStatus.CREATED },
        data: { status: PaymentOrderStatus.FAILED, failureReason: payment.error_description?.slice(0, 500) ?? "Payment failed" },
      });
    }
  }
}

export const walletService = new WalletService();
