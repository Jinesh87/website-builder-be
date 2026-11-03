-- Per-product catalogue visibility. Existing products stay listed.
ALTER TABLE "products" ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true;
