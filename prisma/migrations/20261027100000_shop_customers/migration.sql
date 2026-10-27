-- CreateTable
CREATE TABLE "shop_customers" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "lastSignedInAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_customer_refresh_tokens" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_customer_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_customers_websiteId_status_idx" ON "shop_customers"("websiteId", "status");

-- CreateIndex
CREATE INDEX "shop_customers_clientId_idx" ON "shop_customers"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_customers_websiteId_email_key" ON "shop_customers"("websiteId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "shop_customer_refresh_tokens_tokenHash_key" ON "shop_customer_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "shop_customer_refresh_tokens_customerId_idx" ON "shop_customer_refresh_tokens"("customerId");

-- AddForeignKey
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_customer_refresh_tokens" ADD CONSTRAINT "shop_customer_refresh_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
