-- AlterEnum
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "returnReason" VARCHAR(500);
