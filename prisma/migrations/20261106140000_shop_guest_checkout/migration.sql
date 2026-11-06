-- Guest checkout: shop setting, guest customers, guest carts, public order tracking token.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "shopAllowGuestCheckout" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "shop_customers" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "shop_cart_items" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "shop_cart_items" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "shop_cart_items_guestSessionId_variantId_key"
  ON "shop_cart_items"("guestSessionId", "variantId");
CREATE INDEX IF NOT EXISTS "shop_cart_items_websiteId_guestSessionId_idx"
  ON "shop_cart_items"("websiteId", "guestSessionId");

ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "publicAccessToken" VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS "shop_orders_publicAccessToken_key"
  ON "shop_orders"("publicAccessToken");
