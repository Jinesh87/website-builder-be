-- Base (cost) price per variant, for profit reporting. Null on products saved before it existed.
ALTER TABLE "product_variants" ADD COLUMN "costPaise" INTEGER;
-- The unit cost at the time of sale, so later cost changes don't rewrite past profit.
ALTER TABLE "shop_order_items" ADD COLUMN "unitCostPaise" INTEGER;
