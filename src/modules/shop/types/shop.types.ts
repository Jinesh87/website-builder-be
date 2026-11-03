export type ShopOptionInput = {
  name: string;
  values: string[];
  /** When on, each value is its own card on the shop page. */
  listOnShop?: boolean;
  /** Photos shared by every variant that has this value. */
  images?: { value: string; images: ShopImageInput[] }[];
};

/** One matrix of options that share a price. Overrides change a single combination. */
export type ShopOptionSetInput = {
  pricePaise: number;
  options: ShopOptionInput[];
  overrides?: { key: string; pricePaise: number }[];
  /** Optional SKU per combination key (same key as price overrides). */
  skus?: { key: string; sku: string }[];
  images?: { key: string; images: ShopImageInput[] }[];
};

export type ShopOptionView = {
  name: string;
  values: string[];
  listOnShop?: boolean;
  images?: { value: string; images: ShopImageView[] }[];
};

export type ShopOptionSetView = {
  pricePaise: number;
  options: ShopOptionView[];
  overrides?: { key: string; pricePaise: number }[];
  skus?: { key: string; sku: string }[];
  images?: { key: string; images: ShopImageView[] }[];
};

export type ShopImageInput = {
  mediaId: string;
  alt?: string;
};

export type ShopImageView = {
  mediaId: string;
  url: string;
  alt: string;
};

export type ShopProductInput = {
  name: string;
  description?: string;
  categoryId?: string | null;
  /** Defaults to true when omitted. Hidden from the live shop when false. */
  listed?: boolean;
  /** Defaults to true when omitted. */
  returnsEnabled?: boolean;
  /** Null/omitted = use the shop default return window. */
  returnDays?: number | null;
  optionSets: ShopOptionSetInput[];
  images?: ShopImageInput[];
};

export type ShopCategoryInput = {
  name: string;
};

export type ShopProductQuery = {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

export type ShopProductPage = {
  products: ShopProductView[];
  page: number;
  pageSize: number;
  total: number;
};

/** Query string of a published product list: `q`, `cat`, `sort`, `page`, `per`. */
export type PublicShopListQuery = {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type PublicShopList = {
  search: string;
  category: string;
  sort: "featured" | "price-low" | "price-high" | "name";
  page: number;
  pageSize: number;
  total: number;
  categories: string[];
};

export type ShopVariantView = {
  id: string;
  name: string;
  sku: string | null;
  pricePaise: number;
  sortOrder: number;
  quantity: number;
  images: ShopImageView[];
};

export type ShopCategoryView = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export type ShopProductView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  listed: boolean;
  returnsEnabled: boolean;
  /** Null = use the shop default return window. */
  returnDays: number | null;
  optionSets: ShopOptionSetView[];
  images: ShopImageView[];
  variants: ShopVariantView[];
  updatedAt: string;
};

/** What a published product section renders. Prices stay in paise. */
export type PublicShopImage = { url: string; alt: string };

export type PublicShopVariant = {
  id: string;
  name: string;
  pricePaise: number;
  quantity: number;
  images: PublicShopImage[];
  options: { name: string; value: string; list?: boolean }[];
};

export type PublicShopProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string;
  /** Effective return window for this product. Null = returns not offered. */
  returnDays: number | null;
  images: PublicShopImage[];
  variants: PublicShopVariant[];
};
