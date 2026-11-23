-- Shops can connect their Razorpay account through the platform's Razorpay partner app (OAuth).
CREATE TABLE IF NOT EXISTS "razorpay_partner_app" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "clientId" VARCHAR(100),
    "clientSecretCipher" TEXT,
    "webhookSecretCipher" TEXT,
    "mode" VARCHAR(10) NOT NULL DEFAULT 'live',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "razorpay_partner_app_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shop_payment_configs"
  ADD COLUMN "razorpayAccountId" VARCHAR(64),
  ADD COLUMN "oauthAccessTokenCipher" TEXT,
  ADD COLUMN "oauthRefreshTokenCipher" TEXT,
  ADD COLUMN "oauthPublicToken" VARCHAR(100),
  ADD COLUMN "oauthMode" VARCHAR(10),
  ADD COLUMN "oauthExpiresAt" TIMESTAMPTZ(6),
  ADD COLUMN "oauthConnectedAt" TIMESTAMPTZ(6);

CREATE INDEX "shop_payment_configs_razorpayAccountId_idx" ON "shop_payment_configs"("razorpayAccountId");
