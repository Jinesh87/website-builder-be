-- Guest address book + wishlist (same cookie session as guest cart).
ALTER TABLE "shop_customer_addresses" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "shop_customer_addresses" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;
ALTER TABLE "shop_customer_addresses" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
CREATE INDEX IF NOT EXISTS "shop_customer_addresses_websiteId_guestSessionId_idx"
  ON "shop_customer_addresses"("websiteId", "guestSessionId");

ALTER TABLE "shop_wishlist_items" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "shop_wishlist_items" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "shop_wishlist_items_guestSessionId_variantId_key"
  ON "shop_wishlist_items"("guestSessionId", "variantId");
CREATE INDEX IF NOT EXISTS "shop_wishlist_items_websiteId_guestSessionId_idx"
  ON "shop_wishlist_items"("websiteId", "guestSessionId");
