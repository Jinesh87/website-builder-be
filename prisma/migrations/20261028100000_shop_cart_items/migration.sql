-- CreateTable
CREATE TABLE "shop_cart_items" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_cart_items_websiteId_customerId_idx" ON "shop_cart_items"("websiteId", "customerId");

-- CreateIndex
CREATE INDEX "shop_cart_items_clientId_idx" ON "shop_cart_items"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_cart_items_customerId_variantId_key" ON "shop_cart_items"("customerId", "variantId");

-- AddForeignKey
ALTER TABLE "shop_cart_items" ADD CONSTRAINT "shop_cart_items_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_cart_items" ADD CONSTRAINT "shop_cart_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_cart_items" ADD CONSTRAINT "shop_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_cart_items" ADD CONSTRAINT "shop_cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
