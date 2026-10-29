-- CreateTable
CREATE TABLE "shop_order_status_events" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "ShopOrderStatus" NOT NULL,
    "actorType" VARCHAR(20) NOT NULL,
    "note" VARCHAR(300),
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_order_status_events_orderId_createdAt_idx" ON "shop_order_status_events"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "shop_order_status_events" ADD CONSTRAINT "shop_order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_status_events" ADD CONSTRAINT "shop_order_status_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one event per existing order at its current status
INSERT INTO "shop_order_status_events" ("id", "orderId", "status", "actorType", "note", "createdAt")
SELECT gen_random_uuid(), o."id", o."status", 'SYSTEM', 'Backfilled from existing order', o."createdAt"
FROM "shop_orders" o;
