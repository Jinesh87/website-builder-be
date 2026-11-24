import type { Prisma } from "../../../generated/prisma/client.js";
import { effectiveGst, gstUnitPaise, payableUnitPaise, type ProductGstOverride, type ShopGstDefaults, type ShopGstSettings } from "./shop-gst.js";

/** Orders are numbered per website starting here (Order #1001). */
export const FIRST_ORDER_NUMBER = 1001;

export type OrderLinePricing = {
  gst: ShopGstSettings;
  /** What the customer pays per unit, GST included. */
  unitPayable: number;
  lineTotal: number;
  taxablePaise: number;
  gstPaise: number;
};

/** Prices one order line the same way for online checkout and the POS till. */
export function priceOrderLine(
  product: ProductGstOverride,
  shop: ShopGstDefaults,
  variantPricePaise: number,
  quantity: number,
): OrderLinePricing {
  const gst = effectiveGst(product, shop);
  const unitPayable = payableUnitPaise(variantPricePaise, gst);
  const unitGst = gstUnitPaise(variantPricePaise, gst);
  const unitTaxable = Math.max(0, unitPayable - unitGst);
  return {
    gst,
    unitPayable,
    lineTotal: unitPayable * quantity,
    taxablePaise: unitTaxable * quantity,
    gstPaise: unitGst * quantity,
  };
}

/** Next per-website order number, shared by online and POS orders. */
export async function nextOrderNumber(tx: Prisma.TransactionClient, websiteId: string): Promise<number> {
  const latest = await tx.shopOrder.findFirst({
    where: { websiteId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (latest?.number ?? FIRST_ORDER_NUMBER - 1) + 1;
}
