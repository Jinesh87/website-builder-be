-- Separate Test (development client) and Live (production client) credentials for the Razorpay partner app.
-- "mode" stays as the platform-wide switch between them.
ALTER TABLE "razorpay_partner_app" ADD COLUMN "testClientId" VARCHAR(100);
ALTER TABLE "razorpay_partner_app" ADD COLUMN "testClientSecretCipher" TEXT;
ALTER TABLE "razorpay_partner_app" ADD COLUMN "testWebhookSecretCipher" TEXT;
ALTER TABLE "razorpay_partner_app" ADD COLUMN "liveClientId" VARCHAR(100);
ALTER TABLE "razorpay_partner_app" ADD COLUMN "liveClientSecretCipher" TEXT;
ALTER TABLE "razorpay_partner_app" ADD COLUMN "liveWebhookSecretCipher" TEXT;

-- The credentials saved so far belong to the mode they were saved under.
UPDATE "razorpay_partner_app"
SET "testClientId" = "clientId", "testClientSecretCipher" = "clientSecretCipher", "testWebhookSecretCipher" = "webhookSecretCipher"
WHERE "mode" = 'test';
UPDATE "razorpay_partner_app"
SET "liveClientId" = "clientId", "liveClientSecretCipher" = "clientSecretCipher", "liveWebhookSecretCipher" = "webhookSecretCipher"
WHERE "mode" <> 'test';

ALTER TABLE "razorpay_partner_app" DROP COLUMN "clientId";
ALTER TABLE "razorpay_partner_app" DROP COLUMN "clientSecretCipher";
ALTER TABLE "razorpay_partner_app" DROP COLUMN "webhookSecretCipher";
