CREATE TABLE "shop_payment_configs" (
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "razorpayKeyId" VARCHAR(100),
    "razorpayKeySecretCipher" TEXT,
    "razorpayWebhookSecretCipher" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_payment_configs_pkey" PRIMARY KEY ("websiteId")
);

CREATE INDEX "shop_payment_configs_clientId_idx" ON "shop_payment_configs"("clientId");

ALTER TABLE "shop_payment_configs" ADD CONSTRAINT "shop_payment_configs_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
