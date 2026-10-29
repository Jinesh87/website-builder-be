-- CreateEnum
CREATE TYPE "ShopRefundStatus" AS ENUM ('NONE', 'PENDING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN "razorpayRefundId" VARCHAR(64),
ADD COLUMN "refundStatus" "ShopRefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "refundedAt" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "shop_orders_razorpayPaymentId_idx" ON "shop_orders"("razorpayPaymentId");
