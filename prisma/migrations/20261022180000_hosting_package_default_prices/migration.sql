-- Default list prices: Basic ₹2,100 / quarter, ₹7,000 / year; Standard ₹2,700 / quarter, ₹9,000 / year.
-- Only packages that were never priced are filled in, so prices a Super Admin already set are kept.
WITH defaults ("slug", "quarterly", "yearly") AS (
    VALUES ('basic', 210000, 700000), ('standard', 270000, 900000)
),
priced AS (
    UPDATE "hosting_packages" p
    SET "quarterlyPricePaise" = d."quarterly",
        "yearlyPricePaise" = d."yearly",
        "active" = true,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM defaults d
    WHERE p."slug" = d."slug" AND p."quarterlyPricePaise" = 0 AND p."yearlyPricePaise" = 0
    RETURNING p."name", p."quarterlyPricePaise", p."yearlyPricePaise"
)
INSERT INTO "hosting_price_changes"
    ("id", "scope", "label", "unit", "oldQuarterlyPrice", "newQuarterlyPrice", "oldYearlyPrice", "newYearlyPrice", "createdAt")
SELECT gen_random_uuid(), 'PACKAGE', "name", 'PAISE', 0, "quarterlyPricePaise", 0, "yearlyPricePaise", CURRENT_TIMESTAMP
FROM priced;
