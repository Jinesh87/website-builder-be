-- Printed barcode per product variant, scanned at the POS till.
ALTER TABLE "product_variants" ADD COLUMN "barcode" VARCHAR(64);
CREATE INDEX "product_variants_barcode_idx" ON "product_variants"("barcode");
