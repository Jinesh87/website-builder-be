-- In-store till (POS): orders gain a channel, POS payment details and an optional customer account.
CREATE TYPE "ShopOrderChannel" AS ENUM ('ONLINE', 'POS');
CREATE TYPE "ShopPosPaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'RAZORPAY_QR');

ALTER TABLE "shop_orders"
  ALTER COLUMN "customerId" DROP NOT NULL,
  ADD COLUMN "channel" "ShopOrderChannel" NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "posPaymentMethod" "ShopPosPaymentMethod",
  ADD COLUMN "posCashReceivedPaise" INTEGER,
  ADD COLUMN "posPaymentReference" VARCHAR(100),
  ADD COLUMN "posCustomer" JSONB,
  ADD COLUMN "posCashierId" UUID,
  ADD COLUMN "razorpayQrCodeId" VARCHAR(64);

CREATE UNIQUE INDEX "shop_orders_razorpayQrCodeId_key" ON "shop_orders"("razorpayQrCodeId");
CREATE INDEX "shop_orders_websiteId_channel_createdAt_idx" ON "shop_orders"("websiteId", "channel", "createdAt");
