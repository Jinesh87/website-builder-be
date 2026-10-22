export type ShopOptionInput = {
  name: string;
  values: string[];
};

/** One matrix of options that share a price. Overrides change a single combination. */
export type ShopOptionSetInput = {
  pricePaise: number;
  options: ShopOptionInput[];
  overrides?: { key: string; pricePaise: number }[];
  images?: { key: string; images: ShopImageInput[] }[];
};

export type ShopOptionSetView = {
  pricePaise: number;
  options: ShopOptionInput[];
  overrides?: { key: string; pricePaise: number }[];
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
  categoryId: string;
  optionSets: ShopOptionSetInput[];
  images?: ShopImageInput[];
};

export type ShopCategoryInput = {
  name: string;
};

export type ShopProductQuery = {
  search?: string;
  categoryId?: string;
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
  categoryId: string;
  categoryName: string;
  optionSets: ShopOptionSetView[];
  images: ShopImageView[];
  variants: ShopVariantView[];
  updatedAt: string;
};
