-- AlterEnum
ALTER TYPE "PartnerActivityKind" ADD VALUE IF NOT EXISTS 'COMMISSION_POLICY_UPDATED';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PartnerCommissionPolicy" AS ENUM ('GLOBAL_DEFAULT', 'FIRST_PAYMENT', 'EVERY_RENEWAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "commissionPolicy" "PartnerCommissionPolicy" NOT NULL DEFAULT 'GLOBAL_DEFAULT';

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_program_config" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "defaultCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "defaultCommissionPolicy" "PartnerCommissionPolicy" NOT NULL DEFAULT 'FIRST_PAYMENT',
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_program_config_pkey" PRIMARY KEY ("id")
);

