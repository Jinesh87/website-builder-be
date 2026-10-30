-- Shared visual design for shop order emails (layout, colour, logo).
CREATE TABLE "shop_order_email_designs" (
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "layout" VARCHAR(20) NOT NULL DEFAULT 'classic',
    "accentColor" VARCHAR(7) NOT NULL DEFAULT '#194a7a',
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "logoMediaId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shop_order_email_designs_pkey" PRIMARY KEY ("websiteId")
);

CREATE UNIQUE INDEX "shop_order_email_designs_websiteId_clientId_key" ON "shop_order_email_designs"("websiteId", "clientId");
CREATE INDEX "shop_order_email_designs_clientId_idx" ON "shop_order_email_designs"("clientId");

ALTER TABLE "shop_order_email_designs"
  ADD CONSTRAINT "shop_order_email_designs_websiteId_clientId_fkey"
  FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop_order_email_designs"
  ADD CONSTRAINT "shop_order_email_designs_logoMediaId_fkey"
  FOREIGN KEY ("logoMediaId") REFERENCES "media_files"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
