-- Razorpay activity per shop (orders, payment checks, refunds, webhooks) for the owner's Razorpay logs tab.
CREATE TABLE IF NOT EXISTS "shop_payment_logs" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "orderId" UUID,
    "orderNumber" INTEGER,
    "kind" VARCHAR(40) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "amountPaise" INTEGER,
    "razorpayRef" VARCHAR(80),
    "message" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_payment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shop_payment_logs_websiteId_createdAt_idx" ON "shop_payment_logs"("websiteId", "createdAt");
CREATE INDEX IF NOT EXISTS "shop_payment_logs_clientId_idx" ON "shop_payment_logs"("clientId");

ALTER TABLE "shop_payment_logs" ADD CONSTRAINT "shop_payment_logs_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
