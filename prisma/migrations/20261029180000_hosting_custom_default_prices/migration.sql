-- The custom package's "starting from" price becomes its default price: charged to every website on the custom
-- package that has no price of its own. Paid custom plans keep the price they paid, so this changes no renewal.
ALTER TABLE "hosting_packages" RENAME COLUMN "startingQuarterlyPaise" TO "defaultQuarterlyPaise";
ALTER TABLE "hosting_packages" RENAME COLUMN "startingYearlyPaise" TO "defaultYearlyPaise";
ALTER TABLE "hosting_packages" RENAME CONSTRAINT "hosting_packages_starting_prices_non_negative" TO "hosting_packages_default_prices_non_negative";

-- Custom plans already paid keep what they pay now: fill a cycle with no price of its own from today's default.
UPDATE "hosting_subscriptions" AS s
SET "customQuarterlyPaise" = COALESCE(s."customQuarterlyPaise", NULLIF(p."defaultQuarterlyPaise", 0)),
    "customYearlyPaise" = COALESCE(s."customYearlyPaise", NULLIF(p."defaultYearlyPaise", 0)),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "hosting_packages" AS p
WHERE s."packageId" = p."id"
  AND p."isCustom"
  AND s."currentPeriodEnd" IS NOT NULL
  AND (s."customQuarterlyPaise" IS NULL OR s."customYearlyPaise" IS NULL);
