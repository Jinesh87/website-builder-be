-- CreateEnum
CREATE TYPE "WebsiteOfflineReason" AS ENUM ('MANUAL', 'BILLING');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "HostingStatus" AS ENUM ('AWAITING_PAYMENT', 'ACTIVE', 'GRACE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "HostingPayer" AS ENUM ('CLIENT', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HostingPaymentMethod" AS ENUM ('WALLET', 'CASH', 'UPI', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "HostingNoticeKind" AS ENUM ('RENEWAL_REMINDER', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "HostingPriceScope" AS ENUM ('GLOBAL', 'CLIENT', 'WEBSITE');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CLIENT', 'ADMIN');

-- AlterEnum
ALTER TYPE "WalletTransactionSource" ADD VALUE 'HOSTING';

-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "offlineReason" "WebsiteOfflineReason";

-- CreateTable
CREATE TABLE "hosting_config" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "quarterlyPrice" INTEGER NOT NULL DEFAULT 0,
    "yearlyPrice" INTEGER NOT NULL DEFAULT 0,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "graceDays" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_hosting_prices" (
    "clientId" UUID NOT NULL,
    "quarterlyPrice" INTEGER,
    "yearlyPrice" INTEGER,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_hosting_prices_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "hosting_subscriptions" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "quarterlyPrice" INTEGER,
    "yearlyPrice" INTEGER,
    "status" "HostingStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "graceEndsAt" TIMESTAMPTZ(6),
    "suspendedAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosting_payments" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID,
    "clientId" UUID NOT NULL,
    "websiteId" UUID,
    "websiteName" VARCHAR(120) NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "paidBy" "HostingPayer" NOT NULL,
    "method" "HostingPaymentMethod" NOT NULL,
    "collectedPaise" INTEGER,
    "reference" VARCHAR(120),
    "note" VARCHAR(500),
    "walletTransactionId" UUID,
    "recordedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosting_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosting_notices" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "kind" "HostingNoticeKind" NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosting_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosting_price_changes" (
    "id" UUID NOT NULL,
    "scope" "HostingPriceScope" NOT NULL,
    "clientId" UUID,
    "websiteId" UUID,
    "label" VARCHAR(160) NOT NULL,
    "oldQuarterlyPrice" INTEGER,
    "newQuarterlyPrice" INTEGER,
    "oldYearlyPrice" INTEGER,
    "newYearlyPrice" INTEGER,
    "changedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosting_price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "clientId" UUID,
    "kind" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(300),
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_subscriptions_websiteId_key" ON "hosting_subscriptions"("websiteId");

-- CreateIndex
CREATE INDEX "hosting_subscriptions_status_currentPeriodEnd_idx" ON "hosting_subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "hosting_subscriptions_status_graceEndsAt_idx" ON "hosting_subscriptions"("status", "graceEndsAt");

-- CreateIndex
CREATE INDEX "hosting_subscriptions_clientId_idx" ON "hosting_subscriptions"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_subscriptions_websiteId_clientId_key" ON "hosting_subscriptions"("websiteId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_payments_walletTransactionId_key" ON "hosting_payments"("walletTransactionId");

-- CreateIndex
CREATE INDEX "hosting_payments_clientId_createdAt_idx" ON "hosting_payments"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "hosting_payments_createdAt_idx" ON "hosting_payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_payments_subscriptionId_periodStart_key" ON "hosting_payments"("subscriptionId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_notices_subscriptionId_kind_periodEnd_key" ON "hosting_notices"("subscriptionId", "kind", "periodEnd");

-- CreateIndex
CREATE INDEX "hosting_price_changes_createdAt_idx" ON "hosting_price_changes"("createdAt");

-- CreateIndex
CREATE INDEX "hosting_price_changes_clientId_createdAt_idx" ON "hosting_price_changes"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_audience_clientId_createdAt_idx" ON "notifications"("audience", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_audience_readAt_idx" ON "notifications"("audience", "readAt");

-- AddForeignKey
ALTER TABLE "client_hosting_prices" ADD CONSTRAINT "client_hosting_prices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "hosting_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_notices" ADD CONSTRAINT "hosting_notices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "hosting_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_price_changes" ADD CONSTRAINT "hosting_price_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prices are whole connects and never negative; billing windows stay within sane bounds.
ALTER TABLE "hosting_config" ADD CONSTRAINT "hosting_config_prices_non_negative" CHECK ("quarterlyPrice" >= 0 AND "yearlyPrice" >= 0);
ALTER TABLE "hosting_config" ADD CONSTRAINT "hosting_config_days_range" CHECK ("reminderDays" BETWEEN 0 AND 60 AND "graceDays" BETWEEN 0 AND 60);
ALTER TABLE "client_hosting_prices" ADD CONSTRAINT "client_hosting_prices_non_negative" CHECK (COALESCE("quarterlyPrice", 0) >= 0 AND COALESCE("yearlyPrice", 0) >= 0);
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_prices_non_negative" CHECK (COALESCE("quarterlyPrice", 0) >= 0 AND COALESCE("yearlyPrice", 0) >= 0);
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_amount_non_negative" CHECK ("amount" >= 0 AND COALESCE("collectedPaise", 0) >= 0);
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_period_order" CHECK ("periodEnd" > "periodStart");
