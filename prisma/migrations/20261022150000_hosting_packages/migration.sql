-- Hosting moves from connects to rupees: Basic / Standard / Custom packages priced in paise, paid by Razorpay
-- (default) or, optionally, connects. Every existing price is converted at the old rate of 3 connects = ₹1,
-- so nobody's price changes; paid periods, statuses and history are kept.

-- CreateEnum
CREATE TYPE "HostingPriceUnit" AS ENUM ('CONNECTS', 'PAISE');

-- AlterEnum
ALTER TYPE "HostingPaymentMethod" ADD VALUE 'RAZORPAY';

-- AlterEnum
ALTER TYPE "HostingPriceScope" ADD VALUE 'PACKAGE';

-- CreateTable
CREATE TABLE "hosting_packages" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "quarterlyPricePaise" INTEGER NOT NULL DEFAULT 0,
    "yearlyPricePaise" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_packages_slug_key" ON "hosting_packages"("slug");

ALTER TABLE "hosting_packages" ADD CONSTRAINT "hosting_packages_prices_non_negative"
    CHECK ("quarterlyPricePaise" >= 0 AND "yearlyPricePaise" >= 0);
ALTER TABLE "hosting_packages" ADD CONSTRAINT "hosting_packages_custom_unpriced"
    CHECK (NOT "isCustom" OR ("quarterlyPricePaise" = 0 AND "yearlyPricePaise" = 0));

-- Seed the three packages. Basic takes over the old platform prices; Standard starts hidden until the Super Admin
-- prices it; Custom keeps the old "contact us" card.
INSERT INTO "hosting_packages"
    ("id", "slug", "name", "description", "isCustom", "quarterlyPricePaise", "yearlyPricePaise", "features", "featured", "active", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), 'basic', 'Basic', 'Hosting for one website, with everything you need to go live.', false,
       ROUND(COALESCE(c."quarterlyPrice", 0) * 100.0 / 3)::INTEGER,
       ROUND(COALESCE(c."yearlyPrice", 0) * 100.0 / 3)::INTEGER,
       ARRAY['Hosting for one website', 'Unlimited templates', 'Manual and AI builder'], false, true, 1, CURRENT_TIMESTAMP
FROM (SELECT 1) AS one
LEFT JOIN "hosting_config" c ON c."id" = 'default';

INSERT INTO "hosting_packages"
    ("id", "slug", "name", "description", "isCustom", "features", "featured", "active", "sortOrder", "updatedAt")
VALUES
    (gen_random_uuid(), 'standard', 'Standard', 'Hosting for one website, for growing businesses.', false,
     ARRAY['Hosting for one website', 'Unlimited templates', 'Manual and AI builder'], true, false, 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'custom', 'Custom', 'A custom-designed template tailored to specific client requirements.', true,
     ARRAY['Custom-designed template', 'Unlimited templates', 'Manual and AI builder'], false, true, 3, CURRENT_TIMESTAMP);

-- Price history so far is in connects.
ALTER TABLE "hosting_price_changes" ADD COLUMN "unit" "HostingPriceUnit" NOT NULL DEFAULT 'PAISE';
UPDATE "hosting_price_changes" SET "unit" = 'CONNECTS';

-- Subscriptions: package, and website prices in paise.
ALTER TABLE "hosting_subscriptions"
    ADD COLUMN "packageId" UUID,
    ADD COLUMN "customQuarterlyPaise" INTEGER,
    ADD COLUMN "customYearlyPaise" INTEGER,
    ALTER COLUMN "autoRenew" SET DEFAULT false;

-- Client prices become website prices: a plan for every website of such a client, so none of them loses the deal.
INSERT INTO "hosting_subscriptions" ("id", "websiteId", "clientId", "cycle", "status", "autoRenew", "updatedAt")
SELECT gen_random_uuid(), w."id", w."clientId", 'QUARTERLY', 'AWAITING_PAYMENT', false, CURRENT_TIMESTAMP
FROM "websites" w
JOIN "client_hosting_prices" cp ON cp."clientId" = w."clientId"
WHERE NOT EXISTS (SELECT 1 FROM "hosting_subscriptions" s WHERE s."websiteId" = w."id");

-- A plan with any own price (website or client) moves to the custom package. The old lookup was per cycle
-- (website, then client, then platform), so a cycle without an own price keeps the platform price it had.
WITH resolved AS (
    SELECT s."id",
           COALESCE(s."quarterlyPrice", cp."quarterlyPrice", c."quarterlyPrice", 0) AS quarterly,
           COALESCE(s."yearlyPrice", cp."yearlyPrice", c."yearlyPrice", 0) AS yearly,
           cp."clientId" IS NOT NULL AND s."quarterlyPrice" IS NULL AND s."yearlyPrice" IS NULL AS from_client
    FROM "hosting_subscriptions" s
    LEFT JOIN "client_hosting_prices" cp ON cp."clientId" = s."clientId"
    LEFT JOIN "hosting_config" c ON c."id" = 'default'
    WHERE s."quarterlyPrice" IS NOT NULL OR s."yearlyPrice" IS NOT NULL
       OR cp."quarterlyPrice" IS NOT NULL OR cp."yearlyPrice" IS NOT NULL
)
UPDATE "hosting_subscriptions" s
SET "packageId" = (SELECT "id" FROM "hosting_packages" WHERE "slug" = 'custom'),
    "customQuarterlyPaise" = ROUND(r.quarterly * 100.0 / 3)::INTEGER,
    "customYearlyPaise" = ROUND(r.yearly * 100.0 / 3)::INTEGER
FROM resolved r
WHERE r."id" = s."id";

-- Record the client prices that became website prices.
INSERT INTO "hosting_price_changes"
    ("id", "scope", "clientId", "websiteId", "label", "unit", "newQuarterlyPrice", "newYearlyPrice", "createdAt")
SELECT gen_random_uuid(), 'WEBSITE', s."clientId", s."websiteId", LEFT(w."name" || ' (from client price)', 160), 'PAISE',
       s."customQuarterlyPaise", s."customYearlyPaise", CURRENT_TIMESTAMP
FROM "hosting_subscriptions" s
JOIN "websites" w ON w."id" = s."websiteId"
JOIN "client_hosting_prices" cp ON cp."clientId" = s."clientId"
WHERE s."quarterlyPrice" IS NULL AND s."yearlyPrice" IS NULL AND s."customQuarterlyPaise" IS NOT NULL;

-- Everyone else was on the platform price, which is now Basic.
UPDATE "hosting_subscriptions"
SET "packageId" = (SELECT "id" FROM "hosting_packages" WHERE "slug" = 'basic')
WHERE "packageId" IS NULL;

ALTER TABLE "hosting_subscriptions" DROP CONSTRAINT "hosting_subscriptions_prices_non_negative";
ALTER TABLE "hosting_subscriptions" DROP COLUMN "quarterlyPrice", DROP COLUMN "yearlyPrice";
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_custom_prices_non_negative"
    CHECK (COALESCE("customQuarterlyPaise", 0) >= 0 AND COALESCE("customYearlyPaise", 0) >= 0);

-- CreateIndex
CREATE INDEX "hosting_subscriptions_packageId_idx" ON "hosting_subscriptions"("packageId");

-- AddForeignKey
ALTER TABLE "hosting_subscriptions" ADD CONSTRAINT "hosting_subscriptions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "hosting_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Client prices are folded into website prices.
ALTER TABLE "client_hosting_prices" DROP CONSTRAINT "client_hosting_prices_clientId_fkey";
DROP TABLE "client_hosting_prices";

-- Prices live on the packages now.
ALTER TABLE "hosting_config" DROP CONSTRAINT "hosting_config_prices_non_negative";
ALTER TABLE "hosting_config" DROP COLUMN "quarterlyPrice", DROP COLUMN "yearlyPrice",
    ADD COLUMN "allowConnectsPayment" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "hosting_orders" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "websiteId" UUID,
    "userId" UUID,
    "packageId" UUID,
    "packageName" VARCHAR(60) NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "razorpayOrderId" VARCHAR(64) NOT NULL,
    "razorpayPaymentId" VARCHAR(64),
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "failureReason" VARCHAR(500),
    "paidAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hosting_orders_amount_positive" CHECK ("amountPaise" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_orders_razorpayOrderId_key" ON "hosting_orders"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_orders_razorpayPaymentId_key" ON "hosting_orders"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "hosting_orders_clientId_createdAt_idx" ON "hosting_orders"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "hosting_orders_websiteId_createdAt_idx" ON "hosting_orders"("websiteId", "createdAt");

-- AddForeignKey
ALTER TABLE "hosting_orders" ADD CONSTRAINT "hosting_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_orders" ADD CONSTRAINT "hosting_orders_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_orders" ADD CONSTRAINT "hosting_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_orders" ADD CONSTRAINT "hosting_orders_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "hosting_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payments: the price in paise for every period; connects only for wallet payments made so far.
ALTER TABLE "hosting_payments" DROP CONSTRAINT "hosting_payments_amount_non_negative";
ALTER TABLE "hosting_payments" RENAME COLUMN "amount" TO "connects";
ALTER TABLE "hosting_payments" ALTER COLUMN "connects" DROP NOT NULL;
ALTER TABLE "hosting_payments"
    ADD COLUMN "amountPaise" INTEGER,
    ADD COLUMN "packageName" VARCHAR(60),
    ADD COLUMN "hostingOrderId" UUID;
UPDATE "hosting_payments" SET "amountPaise" = COALESCE("collectedPaise", ROUND("connects" * 100.0 / 3)::INTEGER);
ALTER TABLE "hosting_payments" ALTER COLUMN "amountPaise" SET NOT NULL;
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_amounts_non_negative"
    CHECK ("amountPaise" >= 0 AND COALESCE("connects", 0) >= 0 AND COALESCE("collectedPaise", 0) >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_payments_hostingOrderId_key" ON "hosting_payments"("hostingOrderId");

-- AddForeignKey
ALTER TABLE "hosting_payments" ADD CONSTRAINT "hosting_payments_hostingOrderId_fkey" FOREIGN KEY ("hostingOrderId") REFERENCES "hosting_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
