-- Whether Razorpay QR Codes works for the shop's Razorpay account (null = not checked yet).
ALTER TABLE "shop_payment_configs" ADD COLUMN "qrCodesEnabled" BOOLEAN;
ALTER TABLE "shop_payment_configs" ADD COLUMN "qrCheckedAt" TIMESTAMPTZ(6);
