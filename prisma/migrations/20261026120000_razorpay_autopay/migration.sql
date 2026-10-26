-- Razorpay subscriptions: hosting autopay per website (card / UPI mandate) and a monthly connects auto top-up per
-- client. Each charge is recorded as a hosting order or payment order, so it is applied exactly once like a checkout.
-- Additive only: existing plans, orders and payments are untouched.

-- CreateEnum
CREATE TYPE "AutopayStatus" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED', 'PAUSED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "hosting_orders" ADD COLUMN "razorpaySubscriptionId" VARCHAR(64);

-- AlterTable
ALTER TABLE "payment_orders" ADD COLUMN "razorpaySubscriptionId" VARCHAR(64);

-- CreateTable
CREATE TABLE "hosting_autopays" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" UUID,
    "razorpaySubscriptionId" VARCHAR(64) NOT NULL,
    "packageId" UUID,
    "packageName" VARCHAR(60) NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "AutopayStatus" NOT NULL DEFAULT 'CREATED',
    "startAt" TIMESTAMPTZ(6),
    "nextChargeAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_autopays_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hosting_autopays_amount_positive" CHECK ("amountPaise" > 0)
);

-- CreateTable
CREATE TABLE "wallet_auto_topups" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" UUID,
    "razorpaySubscriptionId" VARCHAR(64) NOT NULL,
    "connects" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "AutopayStatus" NOT NULL DEFAULT 'CREATED',
    "nextChargeAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_auto_topups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallet_auto_topups_amounts_positive" CHECK ("connects" > 0 AND "amountPaise" > 0)
);

-- CreateTable
CREATE TABLE "razorpay_plans" (
    "id" UUID NOT NULL,
    "keyId" VARCHAR(100) NOT NULL,
    "razorpayPlanId" VARCHAR(64) NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "interval" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "itemName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "razorpay_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_autopays_subscriptionId_key" ON "hosting_autopays"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_autopays_razorpaySubscriptionId_key" ON "hosting_autopays"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "hosting_autopays_clientId_idx" ON "hosting_autopays"("clientId");

-- CreateIndex
CREATE INDEX "hosting_autopays_packageId_idx" ON "hosting_autopays"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auto_topups_clientId_key" ON "wallet_auto_topups"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auto_topups_razorpaySubscriptionId_key" ON "wallet_auto_topups"("razorpaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_plans_razorpayPlanId_key" ON "razorpay_plans"("razorpayPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_plans_keyId_period_interval_amountPaise_currency_i_key" ON "razorpay_plans"("keyId", "period", "interval", "amountPaise", "currency", "itemName");

-- AddForeignKey
ALTER TABLE "hosting_autopays" ADD CONSTRAINT "hosting_autopays_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "hosting_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_autopays" ADD CONSTRAINT "hosting_autopays_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_autopays" ADD CONSTRAINT "hosting_autopays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_autopays" ADD CONSTRAINT "hosting_autopays_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "hosting_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_auto_topups" ADD CONSTRAINT "wallet_auto_topups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_auto_topups" ADD CONSTRAINT "wallet_auto_topups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
