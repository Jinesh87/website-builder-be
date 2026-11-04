-- AlterEnum
ALTER TYPE "PartnerActivityKind" ADD VALUE IF NOT EXISTS 'PAYOUT_REQUESTED';
ALTER TYPE "PartnerActivityKind" ADD VALUE IF NOT EXISTS 'PAYOUT_APPROVED';
ALTER TYPE "PartnerActivityKind" ADD VALUE IF NOT EXISTS 'PAYOUT_REJECTED';
ALTER TYPE "PartnerActivityKind" ADD VALUE IF NOT EXISTS 'BANK_DETAILS_UPDATED';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'UPI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable partners
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "accountHolderName" VARCHAR(120);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "bankAccountNumber" VARCHAR(60);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "ifscCode" VARCHAR(30);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "upiId" VARCHAR(100);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "panNumber" VARCHAR(30);

-- CreateTable partner_payout_requests
CREATE TABLE IF NOT EXISTS "partner_payout_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestNumber" SERIAL NOT NULL,
    "partnerId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "accountHolderName" VARCHAR(120),
    "bankAccountNumber" VARCHAR(60),
    "ifscCode" VARCHAR(30),
    "upiId" VARCHAR(100),
    "transactionReference" VARCHAR(120),
    "invoiceNumber" VARCHAR(60),
    "adminNotes" VARCHAR(500),
    "rejectionReason" VARCHAR(500),
    "actorId" UUID,
    "actorName" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payout_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_payout_requests_requestNumber_key" UNIQUE ("requestNumber"),
    CONSTRAINT "partner_payout_requests_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "partner_payout_requests_partnerId_status_idx" ON "partner_payout_requests"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "partner_payout_requests_status_createdAt_idx" ON "partner_payout_requests"("status", "createdAt");

-- Auto-approve existing pending commissions so there is no 15-day refund hold
UPDATE "partner_commissions" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

