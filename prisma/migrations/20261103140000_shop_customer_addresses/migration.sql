-- Saved shipping addresses for shop customers.
CREATE TABLE "shop_customer_addresses" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "label" VARCHAR(40),
    "fullName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "line1" VARCHAR(200) NOT NULL,
    "line2" VARCHAR(200),
    "city" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_customer_addresses_customerId_createdAt_idx" ON "shop_customer_addresses"("customerId", "createdAt");
CREATE INDEX "shop_customer_addresses_websiteId_customerId_idx" ON "shop_customer_addresses"("websiteId", "customerId");
CREATE INDEX "shop_customer_addresses_clientId_idx" ON "shop_customer_addresses"("clientId");

ALTER TABLE "shop_customer_addresses" ADD CONSTRAINT "shop_customer_addresses_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_customer_addresses" ADD CONSTRAINT "shop_customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
