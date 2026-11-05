/** GST helpers for product prices stored in paise. */

export type ShopGstSettings = {
  gstPercent: number;
  priceIncludesGst: boolean;
};

export type ShopGstDefaults = {
  shopGstPercent?: number | null;
  shopPriceIncludesGst?: boolean | null;
};

export type ProductGstOverride = {
  gstPercent?: number | null;
  priceIncludesGst?: boolean | null;
};

/** Resolve product override against shop defaults. */
export function effectiveGst(product: ProductGstOverride, shop: ShopGstDefaults = {}): ShopGstSettings {
  return {
    gstPercent: Math.max(0, Math.min(100, Math.floor(product.gstPercent ?? shop.shopGstPercent ?? 0))),
    priceIncludesGst: (product.priceIncludesGst ?? shop.shopPriceIncludesGst) !== false,
  };
}

/** What the customer pays for one unit. */
export function payableUnitPaise(pricePaise: number, settings: ShopGstSettings): number {
  const percent = Math.max(0, Math.min(100, Math.floor(settings.gstPercent || 0)));
  if (percent <= 0 || settings.priceIncludesGst) return pricePaise;
  return Math.round(pricePaise * (1 + percent / 100));
}

/** GST portion of one unit's payable amount. */
export function gstUnitPaise(pricePaise: number, settings: ShopGstSettings): number {
  const percent = Math.max(0, Math.min(100, Math.floor(settings.gstPercent || 0)));
  if (percent <= 0) return 0;
  if (settings.priceIncludesGst) {
    return Math.max(0, pricePaise - Math.round(pricePaise / (1 + percent / 100)));
  }
  return Math.max(0, payableUnitPaise(pricePaise, settings) - pricePaise);
}
