-- Snapshot of the delivery address chosen at checkout.
ALTER TABLE "shop_orders" ADD COLUMN "shippingAddress" JSONB;
