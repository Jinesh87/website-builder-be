-- CreateEnum
CREATE TYPE "ShopCouponDiscountType" AS ENUM ('PERCENT', 'FIXED_PAISE');

-- AlterTable
ALTER TABLE "shop_orders"
  ADD COLUMN IF NOT EXISTS "couponId" UUID,
  ADD COLUMN IF NOT EXISTS "couponCode" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "listAmountPaise" INTEGER,
  ADD COLUMN IF NOT EXISTS "discountPaise" INTEGER;

-- CreateTable
CREATE TABLE "shop_coupons" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "discountType" "ShopCouponDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "expiresAt" TIMESTAMPTZ(6),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_coupon_redemptions" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "shopOrderId" UUID NOT NULL,
    "listAmountPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "finalAmountPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_coupons_websiteId_code_key" ON "shop_coupons"("websiteId", "code");
CREATE INDEX "shop_coupons_websiteId_active_expiresAt_idx" ON "shop_coupons"("websiteId", "active", "expiresAt");
CREATE INDEX "shop_coupons_clientId_idx" ON "shop_coupons"("clientId");
CREATE INDEX "shop_coupons_productId_idx" ON "shop_coupons"("productId");
CREATE INDEX "shop_orders_couponId_idx" ON "shop_orders"("couponId");
CREATE UNIQUE INDEX "shop_coupon_redemptions_shopOrderId_key" ON "shop_coupon_redemptions"("shopOrderId");
CREATE UNIQUE INDEX "shop_coupon_redemptions_couponId_customerId_key" ON "shop_coupon_redemptions"("couponId", "customerId");
CREATE INDEX "shop_coupon_redemptions_couponId_createdAt_idx" ON "shop_coupon_redemptions"("couponId", "createdAt");
CREATE INDEX "shop_coupon_redemptions_websiteId_createdAt_idx" ON "shop_coupon_redemptions"("websiteId", "createdAt");

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "shop_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop_coupons" ADD CONSTRAINT "shop_coupons_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupons" ADD CONSTRAINT "shop_coupons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupons" ADD CONSTRAINT "shop_coupons_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupon_redemptions" ADD CONSTRAINT "shop_coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "shop_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupon_redemptions" ADD CONSTRAINT "shop_coupon_redemptions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupon_redemptions" ADD CONSTRAINT "shop_coupon_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_coupon_redemptions" ADD CONSTRAINT "shop_coupon_redemptions_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
