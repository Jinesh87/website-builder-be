import { AppError } from "../../../common/errors/AppError.js";
import {
  captureRazorpayPayment,
  fetchRazorpayPayment,
  isOAuthKeys,
  isValidPaymentSignature,
  type RazorpayAuth,
  type RazorpayPayment,
} from "../../wallet/services/razorpay.client.js";
import { razorpayErrorMessage, recordPaymentLog } from "../utils/shop-payment-log.js";

type CheckoutOrder = {
  id: string;
  razorpayOrderId: string | null;
  totalPaise: number;
  currency: string;
};

type PaymentProof = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

/**
 * Checks the checkout's Razorpay signature (API-key shops), confirms the payment matches the order, and captures it when only
 * authorized. Returns the captured payment; every outcome is written to the shop's Razorpay logs.
 */
export async function verifyCheckoutPayment(
  websiteId: string,
  keys: RazorpayAuth,
  order: CheckoutOrder,
  proof: PaymentProof,
): Promise<RazorpayPayment> {
  const log = (kind: "payment_verified" | "payment_captured", success: boolean, message: string, ref = proof.razorpayPaymentId) =>
    recordPaymentLog({ websiteId, orderId: order.id, kind, success, amountPaise: order.totalPaise, razorpayRef: ref, message });

  // A connected (OAuth) account has no key secret to sign with; the payment fetched below with the shop's own
  // access token is the proof instead: it must belong to this Razorpay order, amount and currency.
  if (!isOAuthKeys(keys) && !isValidPaymentSignature(keys.keySecret, proof.razorpayOrderId, proof.razorpayPaymentId, proof.razorpaySignature)) {
    await log("payment_verified", false, "Payment signature didn't match; the payment was not accepted.");
    throw new AppError(
      400,
      "We couldn't verify this payment. If money was taken, your order will update automatically.",
      "PAYMENT_VERIFICATION_FAILED",
    );
  }

  let payment: RazorpayPayment;
  try {
    payment = await fetchRazorpayPayment(keys, proof.razorpayPaymentId);
  } catch (error) {
    await log("payment_verified", false, `Couldn't fetch the payment: ${razorpayErrorMessage(error)}`);
    throw error;
  }
  if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.totalPaise || payment.currency !== order.currency) {
    await log("payment_verified", false, "Payment amount or order didn't match this order.");
    throw new AppError(400, "This payment doesn't match the order.", "PAYMENT_VERIFICATION_FAILED");
  }

  if (payment.status === "authorized") {
    try {
      payment = await captureRazorpayPayment(keys, payment.id, order.totalPaise, order.currency);
      await log("payment_captured", true, "Authorized payment captured.");
    } catch (error) {
      await log("payment_captured", false, `Capture failed: ${razorpayErrorMessage(error)}`);
      throw error;
    }
  }
  if (payment.status !== "captured") {
    await log("payment_verified", false, `Payment is ${payment.status}, not captured yet.`);
    throw new AppError(400, "The payment hasn't completed yet. Your order updates as soon as it does.", "PAYMENT_PENDING");
  }

  await log("payment_verified", true, "Payment received and verified.");
  return payment;
}
