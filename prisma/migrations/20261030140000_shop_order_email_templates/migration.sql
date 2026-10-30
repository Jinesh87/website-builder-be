-- Editable per-status order emails for each website shop.
CREATE TABLE "shop_order_email_templates" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "ShopOrderStatus" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" VARCHAR(200) NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_order_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_order_email_templates_websiteId_status_key" ON "shop_order_email_templates"("websiteId", "status");
CREATE INDEX "shop_order_email_templates_clientId_idx" ON "shop_order_email_templates"("clientId");

ALTER TABLE "shop_order_email_templates"
  ADD CONSTRAINT "shop_order_email_templates_websiteId_clientId_fkey"
  FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId")
  ON DELETE CASCADE ON UPDATE CASCADE;
