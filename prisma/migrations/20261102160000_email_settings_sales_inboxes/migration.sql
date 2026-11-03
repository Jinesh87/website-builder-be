-- AlterTable
ALTER TABLE "messaging_config" ADD COLUMN IF NOT EXISTS "contactSalesEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "questionnaireSalesEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "partnerSalesEmail" VARCHAR(255);
