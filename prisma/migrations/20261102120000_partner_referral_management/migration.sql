-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARTNER';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PartnerActivityKind" AS ENUM ('APPLIED', 'STATUS_CHANGED', 'COMMISSION_RATE_UPDATED', 'COMMISSION_ELIGIBILITY_TOGGLED', 'REFERRAL_CODE_UPDATED', 'EMAIL_SENT', 'NOTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PartnerReferralStatus" AS ENUM ('REGISTERED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CommissionSource" AS ENUM ('WALLET_TOPUP', 'HOSTING', 'SHOP_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "partners" (
    "id" UUID NOT NULL,
    "applicationId" VARCHAR(32) NOT NULL,
    "companyName" VARCHAR(160) NOT NULL,
    "registrationNumber" VARCHAR(60),
    "website" VARCHAR(255),
    "businessType" VARCHAR(50) NOT NULL,
    "yearEstablished" VARCHAR(10) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "businessAddress" VARCHAR(500) NOT NULL,
    "contactName" VARCHAR(120) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "alternatePhone" VARCHAR(32),
    "partnershipType" VARCHAR(50) NOT NULL,
    "targetCategories" JSONB NOT NULL,
    "expectedReferrals" VARCHAR(30) NOT NULL,
    "marketingChannels" JSONB NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "previousExperience" BOOLEAN NOT NULL DEFAULT false,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(1000),
    "suspensionReason" VARCHAR(1000),
    "referralCode" VARCHAR(50),
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "isCommissionActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "approvedBy" VARCHAR(120),
    "rejectedAt" TIMESTAMPTZ(6),
    "suspendedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_activities" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "kind" "PartnerActivityKind" NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "actorId" UUID,
    "actorName" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_referrals" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "referralCode" VARCHAR(50) NOT NULL,
    "userId" UUID,
    "clientId" UUID,
    "customerName" VARCHAR(120) NOT NULL,
    "customerEmail" VARCHAR(255) NOT NULL,
    "status" "PartnerReferralStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMPTZ(6),
    "totalSpentPaise" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_commissions" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "source" "CommissionSource" NOT NULL,
    "paymentOrderId" UUID,
    "hostingOrderId" UUID,
    "shopOrderId" UUID,
    "orderAmountPaise" INTEGER NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmountPaise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMPTZ(6),
    "paymentReference" VARCHAR(120),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partners_applicationId_key" ON "partners"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partners_referralCode_key" ON "partners"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partners_userId_key" ON "partners"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_status_createdAt_idx" ON "partners"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_referralCode_idx" ON "partners"("referralCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_activities_partnerId_createdAt_idx" ON "partner_activities"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_referrals_partnerId_status_idx" ON "partner_referrals"("partnerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_referrals_referralCode_idx" ON "partner_referrals"("referralCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_referrals_clientId_idx" ON "partner_referrals"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partner_referrals_partnerId_customerEmail_key" ON "partner_referrals"("partnerId", "customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partner_commissions_paymentOrderId_key" ON "partner_commissions"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partner_commissions_hostingOrderId_key" ON "partner_commissions"("hostingOrderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "partner_commissions_shopOrderId_key" ON "partner_commissions"("shopOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_commissions_partnerId_status_idx" ON "partner_commissions"("partnerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_commissions_createdAt_idx" ON "partner_commissions"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partners" ADD CONSTRAINT "partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_activities" ADD CONSTRAINT "partner_activities_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "partner_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
