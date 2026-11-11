-- CreateEnum
CREATE TYPE "HostingCouponDiscountType" AS ENUM ('PERCENT', 'FIXED_PAISE');

-- AlterTable
ALTER TABLE "hosting_orders"
  ADD COLUMN IF NOT EXISTS "couponId" UUID,
  ADD COLUMN IF NOT EXISTS "listAmountPaise" INTEGER,
  ADD COLUMN IF NOT EXISTS "discountPaise" INTEGER;

-- CreateTable
CREATE TABLE "hosting_coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "discountType" "HostingCouponDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosting_coupon_redemptions" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" UUID,
    "websiteId" UUID,
    "hostingOrderId" UUID,
    "hostingPaymentId" UUID,
    "listAmountPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "finalAmountPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosting_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_coupons_code_key" ON "hosting_coupons"("code");
CREATE INDEX "hosting_coupons_active_expiresAt_idx" ON "hosting_coupons"("active", "expiresAt");
CREATE INDEX "hosting_orders_couponId_idx" ON "hosting_orders"("couponId");
CREATE UNIQUE INDEX "hosting_coupon_redemptions_hostingOrderId_key" ON "hosting_coupon_redemptions"("hostingOrderId");
CREATE UNIQUE INDEX "hosting_coupon_redemptions_hostingPaymentId_key" ON "hosting_coupon_redemptions"("hostingPaymentId");
CREATE UNIQUE INDEX "hosting_coupon_redemptions_couponId_clientId_key" ON "hosting_coupon_redemptions"("couponId", "clientId");
CREATE INDEX "hosting_coupon_redemptions_couponId_createdAt_idx" ON "hosting_coupon_redemptions"("couponId", "createdAt");
CREATE INDEX "hosting_coupon_redemptions_clientId_createdAt_idx" ON "hosting_coupon_redemptions"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "hosting_orders" ADD CONSTRAINT "hosting_orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "hosting_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hosting_coupons" ADD CONSTRAINT "hosting_coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "hosting_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_hostingOrderId_fkey" FOREIGN KEY ("hostingOrderId") REFERENCES "hosting_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hosting_coupon_redemptions" ADD CONSTRAINT "hosting_coupon_redemptions_hostingPaymentId_fkey" FOREIGN KEY ("hostingPaymentId") REFERENCES "hosting_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
