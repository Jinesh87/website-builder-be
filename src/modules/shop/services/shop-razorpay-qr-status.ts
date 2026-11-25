import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { razorpayRequest } from "../../wallet/services/razorpay.client.js";
import { shopRazorpayAuth } from "./shop-razorpay-auth.js";

/**
 * Razorpay's QR Codes product is switched on per account, and only from the Razorpay Dashboard
 * (creating any QR there once turns it on). Until then its API answers "URL not found".
 * We record whether it works so the Razorpay tab can guide the owner and the till can hide QR payments.
 */

/** Razorpay's reply when QR Codes isn't enabled for the account. */
export function isQrNotEnabledError(error: unknown): boolean {
  if (error instanceof AppError && error.code === "RAZORPAY_QR_NOT_ENABLED") return true;
  return error instanceof Error && /requested URL was not found/i.test(error.message);
}

export async function recordQrCodesStatus(websiteId: string, enabled: boolean | null): Promise<void> {
  await prisma.shopPaymentConfig.updateMany({
    where: { websiteId },
    data: { qrCodesEnabled: enabled, qrCheckedAt: enabled === null ? null : new Date() },
  });
}

/**
 * Asks Razorpay whether QR codes work for the shop's account and saves the answer.
 * Returns null (and saves nothing) when Razorpay isn't set up or couldn't be reached.
 */
export async function checkQrCodes(websiteId: string): Promise<boolean | null> {
  const auth = await shopRazorpayAuth(websiteId);
  if (!auth) return null;
  let enabled: boolean;
  try {
    await razorpayRequest(auth, "GET", "/payments/qr_codes?count=1");
    enabled = true;
  } catch (error) {
    if (!isQrNotEnabledError(error)) {
      logger.warn({ err: error, websiteId }, "Couldn't check Razorpay QR codes");
      return null;
    }
    enabled = false;
  }
  await recordQrCodesStatus(websiteId, enabled);
  return enabled;
}

export function checkQrCodesInBackground(websiteId: string): void {
  void checkQrCodes(websiteId).catch((error: unknown) => logger.warn({ err: error, websiteId }, "Razorpay QR check failed"));
}
