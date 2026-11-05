-- Product GST: percent and whether listed prices already include it.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gstPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "priceIncludesGst" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_gst_percent_range"
    CHECK ("gstPercent" >= 0 AND "gstPercent" <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
