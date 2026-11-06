-- Guest address book + wishlist (same cookie session as guest cart).
-- Wishlist table was missing from earlier migrations (schema-only / db push locally).

-- Addresses: allow anonymous guest-session rows
ALTER TABLE "shop_customer_addresses" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "shop_customer_addresses" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;
ALTER TABLE "shop_customer_addresses" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
CREATE INDEX IF NOT EXISTS "shop_customer_addresses_websiteId_guestSessionId_idx"
  ON "shop_customer_addresses"("websiteId", "guestSessionId");

-- Wishlist: create if absent, then ensure guest-session columns/indexes
CREATE TABLE IF NOT EXISTS "shop_wishlist_items" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "customerId" UUID,
    "guestSessionId" UUID,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_wishlist_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shop_wishlist_items" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "shop_wishlist_items" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "shop_wishlist_items_customerId_variantId_key"
  ON "shop_wishlist_items"("customerId", "variantId");
CREATE UNIQUE INDEX IF NOT EXISTS "shop_wishlist_items_guestSessionId_variantId_key"
  ON "shop_wishlist_items"("guestSessionId", "variantId");
CREATE INDEX IF NOT EXISTS "shop_wishlist_items_websiteId_customerId_idx"
  ON "shop_wishlist_items"("websiteId", "customerId");
CREATE INDEX IF NOT EXISTS "shop_wishlist_items_websiteId_guestSessionId_idx"
  ON "shop_wishlist_items"("websiteId", "guestSessionId");
CREATE INDEX IF NOT EXISTS "shop_wishlist_items_clientId_idx"
  ON "shop_wishlist_items"("clientId");

DO $$ BEGIN
  ALTER TABLE "shop_wishlist_items"
    ADD CONSTRAINT "shop_wishlist_items_websiteId_clientId_fkey"
    FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shop_wishlist_items"
    ADD CONSTRAINT "shop_wishlist_items_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shop_wishlist_items"
    ADD CONSTRAINT "shop_wishlist_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shop_wishlist_items"
    ADD CONSTRAINT "shop_wishlist_items_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
