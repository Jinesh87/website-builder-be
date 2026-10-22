-- AlterTable
ALTER TABLE "products" ADD COLUMN "optionSets" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "name" SET DATA TYPE VARCHAR(160);
