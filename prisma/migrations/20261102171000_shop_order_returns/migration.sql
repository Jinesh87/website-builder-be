-- AlterEnum
ALTER TYPE "ShopOrderStatus" ADD VALUE 'RETURNED';

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN "returnReason" VARCHAR(500);
