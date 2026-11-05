-- Snapshot GST on each order line for invoices (historical accuracy).
ALTER TABLE "shop_order_items" ADD COLUMN IF NOT EXISTS "gstPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shop_order_items" ADD COLUMN IF NOT EXISTS "priceIncludesGst" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shop_order_items" ADD COLUMN IF NOT EXISTS "taxablePaise" INTEGER;
ALTER TABLE "shop_order_items" ADD COLUMN IF NOT EXISTS "gstPaise" INTEGER;

-- Backfill older rows: treat stored totals as tax-inclusive with 0% GST.
UPDATE "shop_order_items"
SET
  "taxablePaise" = COALESCE("taxablePaise", "lineTotalPaise"),
  "gstPaise" = COALESCE("gstPaise", 0)
WHERE "taxablePaise" IS NULL OR "gstPaise" IS NULL;

ALTER TABLE "shop_order_items" ALTER COLUMN "taxablePaise" SET NOT NULL;
ALTER TABLE "shop_order_items" ALTER COLUMN "gstPaise" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_gst_percent_range"
    CHECK ("gstPercent" >= 0 AND "gstPercent" <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
