-- Connects are tracked to a thousandth; AI usage is charged after the call, so balances may go below zero.
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_balance_non_negative";
ALTER TABLE "wallets" ALTER COLUMN "balance" TYPE DECIMAL(14,3);
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount" TYPE DECIMAL(14,3);
ALTER TABLE "wallet_transactions" ALTER COLUMN "balanceAfter" TYPE DECIMAL(14,3);

-- CreateTable
CREATE TABLE "billing_config" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "usdInrMargin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_config_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "billing_config" ADD CONSTRAINT "billing_config_margin_non_negative" CHECK ("usdInrMargin" >= 0);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "rateDate" DATE NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "fetchedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("rateDate")
);

-- AlterTable
ALTER TABLE "ai_usage_logs" ADD COLUMN "costUsd" DECIMAL(14,8),
ADD COLUMN "usdInrRate" DECIMAL(12,4),
ADD COLUMN "connectsCharged" DECIMAL(14,3);
