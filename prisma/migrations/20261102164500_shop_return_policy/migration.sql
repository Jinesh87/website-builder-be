-- Shop-wide return policy (null days = returns off) and per-product overrides.
ALTER TABLE "websites" ADD COLUMN "shopReturnDays" INTEGER;
ALTER TABLE "websites" ADD COLUMN "shopReturnGuidelines" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "products" ADD COLUMN "returnsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "returnDays" INTEGER;
