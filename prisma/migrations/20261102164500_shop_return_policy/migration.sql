-- Shop-wide return policy (null days = returns off) and per-product overrides.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "shopReturnDays" INTEGER;
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "shopReturnGuidelines" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "returnsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "returnDays" INTEGER;
