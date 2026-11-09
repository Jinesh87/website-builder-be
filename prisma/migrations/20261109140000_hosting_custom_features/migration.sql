-- Per-website feature list on the custom package (JSON string[]). NULL = use HostingPackage.features.
ALTER TABLE "hosting_subscriptions" ADD COLUMN IF NOT EXISTS "customFeatures" JSONB;
