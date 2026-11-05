-- Shop-wide default GST settings.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "shopGstPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "shopPriceIncludesGst" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE "websites" ADD CONSTRAINT "websites_shop_gst_percent_range"
    CHECK ("shopGstPercent" >= 0 AND "shopGstPercent" <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Product GST fields become optional overrides (null = use shop default).
ALTER TABLE "products" ALTER COLUMN "gstPercent" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "gstPercent" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "priceIncludesGst" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "priceIncludesGst" DROP NOT NULL;

-- Existing products inherit the shop default until customized.
UPDATE "products" SET "gstPercent" = NULL, "priceIncludesGst" = NULL;
