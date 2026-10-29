-- The custom package's "starting from" price on the pricing page, editable by the Super Admin. Display only.
ALTER TABLE "hosting_packages"
    ADD COLUMN "startingQuarterlyPaise" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "startingYearlyPaise" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "hosting_packages" ADD CONSTRAINT "hosting_packages_starting_prices_non_negative"
    CHECK ("startingQuarterlyPaise" >= 0 AND "startingYearlyPaise" >= 0);

-- Keep the amounts the pricing page showed until now (₹3,600 / 3 months, ₹12,000 / year).
UPDATE "hosting_packages"
SET "startingQuarterlyPaise" = 360000,
    "startingYearlyPaise" = 1200000,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "isCustom";
