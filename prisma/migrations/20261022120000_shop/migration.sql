-- AlterTable
ALTER TABLE "clients" ADD COLUMN "shopFeatureEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "websites" ADD COLUMN "shopEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "shop_categories" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "sku" VARCHAR(64),
    "pricePaise" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_categories_websiteId_slug_key" ON "shop_categories"("websiteId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "shop_categories_id_websiteId_key" ON "shop_categories"("id", "websiteId");

-- CreateIndex
CREATE INDEX "shop_categories_clientId_idx" ON "shop_categories"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "products_websiteId_slug_key" ON "products"("websiteId", "slug");

-- CreateIndex
CREATE INDEX "products_websiteId_categoryId_idx" ON "products"("websiteId", "categoryId");

-- CreateIndex
CREATE INDEX "products_clientId_idx" ON "products"("clientId");

-- CreateIndex
CREATE INDEX "product_variants_productId_sortOrder_idx" ON "product_variants"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_websiteId_fkey" FOREIGN KEY ("categoryId", "websiteId") REFERENCES "shop_categories"("id", "websiteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
