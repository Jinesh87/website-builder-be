-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "totalPaise" INTEGER NOT NULL,
    "razorpayOrderId" VARCHAR(64),
    "razorpayPaymentId" VARCHAR(64),
    "stockDeductedAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "failureReason" VARCHAR(300),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "productName" VARCHAR(160) NOT NULL,
    "variantName" VARCHAR(160) NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,

    CONSTRAINT "shop_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_razorpayOrderId_key" ON "shop_orders"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "shop_orders_websiteId_createdAt_idx" ON "shop_orders"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "shop_orders_websiteId_status_idx" ON "shop_orders"("websiteId", "status");

-- CreateIndex
CREATE INDEX "shop_orders_customerId_createdAt_idx" ON "shop_orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "shop_orders_clientId_idx" ON "shop_orders"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_websiteId_number_key" ON "shop_orders"("websiteId", "number");

-- CreateIndex
CREATE INDEX "shop_order_items_orderId_idx" ON "shop_order_items"("orderId");

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
