-- Guest checkout orders remember the browser session that placed them, so the guest's account page can list them.
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "guestSessionId" UUID;
CREATE INDEX IF NOT EXISTS "shop_orders_websiteId_guestSessionId_idx" ON "shop_orders"("websiteId", "guestSessionId");
