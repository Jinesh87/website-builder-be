-- Per-website grace after unpaid expiry. Null = platform HostingConfig.graceDays.
ALTER TABLE "hosting_subscriptions" ADD COLUMN IF NOT EXISTS "graceDaysOverride" INTEGER;
