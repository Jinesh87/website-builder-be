import Joi from "joi";
import {
  SHOWCASE_CATEGORY_DESIGNS,
  SHOWCASE_IMAGE_ASPECTS,
  SHOWCASE_MAX_CATEGORIES,
  SHOWCASE_MAX_PRODUCTS,
  SHOWCASE_MODES,
  SHOWCASE_PRODUCT_DESIGNS,
  SHOWCASE_SUMMARY_LINES_MAX,
} from "../types/showcase.types.js";

/** Building blocks shared with the rest of the site-content validator. */
export type ShowcaseSchemaParts = {
  text: (max: number) => Joi.StringSchema;
  optionalText: (max: number) => Joi.StringSchema;
  image: Joi.ObjectSchema;
  link: Joi.ObjectSchema;
  columns: Joi.NumberSchema;
};

const itemId = Joi.string().trim().max(64).required();

/** Product showcase: a display-only catalogue of products and categories. */
export function showcaseSchema({ text, optionalText, image, link, columns }: ShowcaseSchemaParts): Joi.ObjectSchema {
  return Joi.object({
    mode: Joi.string()
      .valid(...SHOWCASE_MODES)
      .optional()
      .default("products")
      .description('"products" one grid, "tabs" category filter tabs, "grouped" a heading per category, "categories" category cards only'),
    design: Joi.string().valid(...SHOWCASE_PRODUCT_DESIGNS).optional(),
    categoryDesign: Joi.string().valid(...SHOWCASE_CATEGORY_DESIGNS).optional(),
    eyebrow: optionalText(100),
    heading: text(200).allow("").required(),
    intro: optionalText(500),
    headerAlign: Joi.string().valid("center", "left").optional(),
    categoryId: Joi.string().trim().max(64).allow("").optional().description('"products" mode: list only this category id'),
    allLabel: optionalText(40),
    otherLabel: optionalText(60),
    columns: columns.optional().default(3),
    tabletColumns: columns.optional(),
    mobileColumns: columns.optional().default(1),
    imageAspect: Joi.string().valid(...SHOWCASE_IMAGE_ASPECTS).optional(),
    imageFit: Joi.string().valid("cover", "contain").optional(),
    showImage: Joi.boolean().optional(),
    showName: Joi.boolean().optional(),
    showSummary: Joi.boolean().optional(),
    showPrice: Joi.boolean().optional(),
    showCategory: Joi.boolean().optional(),
    showBadge: Joi.boolean().optional(),
    showButton: Joi.boolean().optional(),
    showCount: Joi.boolean().optional(),
    showCategoryDescription: Joi.boolean().optional(),
    summaryLines: Joi.number().integer().min(0).max(SHOWCASE_SUMMARY_LINES_MAX).optional(),
    defaultLink: link.optional(),
    emptyMessage: optionalText(200),
    categories: Joi.array()
      .items(
        Joi.object({
          id: itemId,
          name: text(80).required(),
          description: optionalText(300),
          image: image.optional(),
          link: link.optional(),
        }),
      )
      .max(SHOWCASE_MAX_CATEGORIES)
      .unique("id")
      .required(),
    products: Joi.array()
      .items(
        Joi.object({
          id: itemId,
          name: text(120).required(),
          summary: optionalText(500),
          price: optionalText(60),
          image: image.optional(),
          badge: optionalText(30),
          categoryId: Joi.string().trim().max(64).allow("").optional(),
          link: link.optional(),
        }),
      )
      .max(SHOWCASE_MAX_PRODUCTS)
      .unique("id")
      .required(),
  });
}
