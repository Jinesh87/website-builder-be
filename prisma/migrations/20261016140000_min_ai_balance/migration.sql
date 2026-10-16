ALTER TABLE "billing_config" ADD COLUMN "minAiBalance" DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "billing_config" ADD CONSTRAINT "billing_config_min_balance_non_negative" CHECK ("minAiBalance" >= 0);
