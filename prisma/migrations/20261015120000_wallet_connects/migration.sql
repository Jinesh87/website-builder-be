-- Wallets now hold connects instead of rupees (1 INR buys 3 connects).
-- Existing rupee balances and their ledger are test data and start over at zero.
DELETE FROM "wallet_transactions";
UPDATE "wallets" SET "balancePaise" = 0;

ALTER TABLE "wallets" DROP CONSTRAINT "wallets_balance_non_negative";
ALTER TABLE "wallets" RENAME COLUMN "balancePaise" TO "balance";
ALTER TABLE "wallets" DROP COLUMN "currency";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_balance_non_negative" CHECK ("balance" >= 0);

ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_amount_positive";
ALTER TABLE "wallet_transactions" RENAME COLUMN "amountPaise" TO "amount";
ALTER TABLE "wallet_transactions" RENAME COLUMN "balanceAfterPaise" TO "balanceAfter";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "payment_orders" ADD COLUMN "connects" INTEGER;
UPDATE "payment_orders" SET "connects" = GREATEST(1, ROUND("amountPaise" * 3 / 100.0));
ALTER TABLE "payment_orders" ALTER COLUMN "connects" SET NOT NULL;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_connects_positive" CHECK ("connects" > 0);
