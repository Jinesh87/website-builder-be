-- Automatic website backup cadence (days). Null = disabled / use package setting.
ALTER TABLE "hosting_packages" ADD COLUMN IF NOT EXISTS "websiteBackupDays" INTEGER;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "websiteBackupDaysOverride" INTEGER;
