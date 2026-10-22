ALTER TABLE "product_variants" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "productName" VARCHAR(160) NOT NULL,
    "variantName" VARCHAR(160) NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "note" VARCHAR(300),
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_movements_websiteId_createdAt_idx" ON "inventory_movements"("websiteId", "createdAt");
CREATE INDEX "inventory_movements_clientId_idx" ON "inventory_movements"("clientId");

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
