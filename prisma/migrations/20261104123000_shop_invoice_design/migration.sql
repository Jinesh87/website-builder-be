CREATE TABLE "shop_invoice_designs" (
  "websiteId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "layout" VARCHAR(20) NOT NULL DEFAULT 'classic',
  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "logoMediaId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shop_invoice_designs_pkey" PRIMARY KEY ("websiteId")
);

CREATE UNIQUE INDEX "shop_invoice_designs_websiteId_clientId_key"
  ON "shop_invoice_designs"("websiteId", "clientId");

CREATE INDEX "shop_invoice_designs_clientId_idx"
  ON "shop_invoice_designs"("clientId");

ALTER TABLE "shop_invoice_designs"
  ADD CONSTRAINT "shop_invoice_designs_websiteId_clientId_fkey"
  FOREIGN KEY ("websiteId", "clientId")
  REFERENCES "websites"("id", "clientId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop_invoice_designs"
  ADD CONSTRAINT "shop_invoice_designs_logoMediaId_fkey"
  FOREIGN KEY ("logoMediaId")
  REFERENCES "media_files"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
