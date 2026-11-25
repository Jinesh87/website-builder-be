import { AppError } from "../../../common/errors/AppError.js";
import { isQrNotEnabledError } from "./shop-razorpay-qr-status.js";
import { razorpayRequest, type RazorpayAuth, type RazorpayPayment } from "../../wallet/services/razorpay.client.js";

/** A Razorpay UPI QR code (https://razorpay.com/docs/api/qr-codes/). */
export type RazorpayQrCode = {
  id: string;
  /** Razorpay-hosted PNG of the QR, ready to show on the till. */
  image_url: string;
  status: "active" | "closed";
  payment_amount: number | null;
  payments_amount_received: number;
  payments_count_received: number;
  close_by: number | null;
  close_reason: string | null;
};

/** A single-use QR for exactly `amountPaise`, closing itself at `closeBy`. */
export function createUpiQr(
  auth: RazorpayAuth,
  input: { amountPaise: number; name: string; description: string; closeBy: Date; notes: Record<string, string> },
): Promise<RazorpayQrCode> {
  return razorpayRequest<RazorpayQrCode>(auth, "POST", "/payments/qr_codes", {
    type: "upi_qr",
    name: input.name.slice(0, 100),
    usage: "single_use",
    fixed_amount: true,
    payment_amount: input.amountPaise,
    description: input.description.slice(0, 100),
    close_by: Math.floor(input.closeBy.getTime() / 1000),
    notes: input.notes,
  }).catch((error: unknown) => {
    // Razorpay answers "URL not found" when the QR Codes product isn't enabled on the account.
    if (isQrNotEnabledError(error)) {
      throw new AppError(
        400,
        "QR codes aren't turned on for this Razorpay account. Ask Razorpay support to enable QR Codes, or take this payment by cash, UPI or card.",
        "RAZORPAY_QR_NOT_ENABLED",
      );
    }
    throw error;
  });
}

export function fetchQr(auth: RazorpayAuth, qrId: string): Promise<RazorpayQrCode> {
  return razorpayRequest(auth, "GET", `/payments/qr_codes/${encodeURIComponent(qrId)}`);
}

export async function fetchQrPayments(auth: RazorpayAuth, qrId: string): Promise<RazorpayPayment[]> {
  const result = await razorpayRequest<{ items?: RazorpayPayment[] }>(
    auth,
    "GET",
    `/payments/qr_codes/${encodeURIComponent(qrId)}/payments`,
  );
  return result.items ?? [];
}

export function closeQr(auth: RazorpayAuth, qrId: string): Promise<RazorpayQrCode> {
  return razorpayRequest(auth, "POST", `/payments/qr_codes/${encodeURIComponent(qrId)}/close`);
}
