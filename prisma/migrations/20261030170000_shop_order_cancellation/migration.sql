-- AlterTable
ALTER TABLE "websites" ADD COLUMN "shopCancelUntilStatus" "ShopOrderStatus";

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN "cancelReason" VARCHAR(500);
