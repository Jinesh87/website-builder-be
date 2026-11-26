import Joi from "joi";
import { PAYMENT_LOG_KINDS } from "../utils/shop-payment-log.js";

export const shopCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required().messages({
    "string.empty": "Enter a category name",
    "string.max": "Category name must be 80 characters or less",
  }),
});

const pricePaise = Joi.number().integer().min(0).max(1_000_000_000).required().messages({
  "number.base": "Enter a price",
  "number.min": "Price can't be negative",
  "number.max": "Price is too high",
});

const costPaise = Joi.number().integer().min(0).max(1_000_000_000).required().messages({
  "any.required": "Enter a base price",
  "number.base": "Enter a base price",
  "number.min": "Base price can't be negative",
  "number.max": "Base price is too high",
});

const imageSchema = Joi.object({
  mediaId: Joi.string().guid().required(),
  alt: Joi.string().trim().max(300).allow("").optional(),
});

const optionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(40).required().messages({
    "string.empty": "Name each option, such as Size or Colour",
  }),
  listOnShop: Joi.boolean().optional(),
  images: Joi.array()
    .items(
      Joi.object({
        value: Joi.string().trim().min(1).max(40).required(),
        images: Joi.array().items(imageSchema).max(8).required().messages({
          "array.max": "A value can have at most 8 images",
        }),
      }),
    )
    .max(20)
    .optional(),
  values: Joi.array()
    .items(Joi.string().trim().min(1).max(40))
    .min(1)
    .max(20)
    .required()
    .messages({
      "array.min": "Add at least one value for each option",
      "array.max": "An option can have at most 20 values",
    }),
});

const optionSetSchema = Joi.object({
  pricePaise,
  costPaise,
  options: Joi.array().items(optionSchema).max(4).required().messages({
    "array.max": "A combination can have at most 4 options",
  }),
  overrides: Joi.array()
    .items(Joi.object({ key: Joi.string().trim().min(1).max(500).required(), pricePaise }))
    .max(100)
    .optional(),
  costOverrides: Joi.array()
    .items(Joi.object({ key: Joi.string().trim().min(1).max(500).required(), costPaise }))
    .max(100)
    .optional(),
  skus: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().trim().max(500).allow("").required(),
        sku: Joi.string().trim().max(64).allow("").required(),
      }),
    )
    .max(100)
    .optional(),
  barcodes: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().trim().max(500).allow("").required(),
        // Printed barcodes are letters, digits and symbols with no spaces (EAN/UPC are digits only).
        barcode: Joi.string().trim().max(64).pattern(/^[\x21-\x7E]*$/).allow("").required().messages({
          "string.pattern.base": "A barcode can't contain spaces or special characters",
          "string.max": "A barcode must be 64 characters or less",
        }),
      }),
    )
    .max(100)
    .optional(),
  images: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().trim().max(500).allow("").required(),
        images: Joi.array().items(imageSchema).max(8).required().messages({
          "array.max": "A variant can have at most 8 images",
        }),
      }),
    )
    .max(100)
    .optional(),
});

export const shopProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(160).required().messages({
    "string.empty": "Enter a product name",
  }),
  description: Joi.string().trim().max(2000).allow("").optional(),
  categoryId: Joi.string().guid().allow(null, "").optional().messages({
    "string.guid": "Choose a valid category",
  }),
  listed: Joi.boolean().optional(),
  gstPercent: Joi.number().integer().min(0).max(100).allow(null).optional().messages({
    "number.min": "GST percent must be 0 or more",
    "number.max": "GST percent cannot exceed 100",
  }),
  priceIncludesGst: Joi.boolean().allow(null).optional(),
  returnsEnabled: Joi.boolean().optional(),
  returnDays: Joi.number().integer().min(1).max(365).allow(null).optional().messages({
    "number.min": "Return window must be at least 1 day",
    "number.max": "Return window cannot exceed 365 days",
  }),
  optionSets: Joi.array().items(optionSetSchema).min(1).max(8).required().messages({
    "array.min": "Add at least one combination",
    "array.max": "A product can have at most 8 combinations",
  }),
  images: Joi.array().items(imageSchema).max(8).optional().messages({
    "array.max": "A product can have at most 8 images",
  }),
});

export const shopProductQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  categoryId: Joi.string().guid().optional(),
  ids: Joi.string()
    .pattern(/^[0-9a-f-]{36}(,[0-9a-f-]{36}){0,49}$/i)
    .optional()
    .messages({ "string.pattern.base": "Send up to 50 product ids, comma separated" }),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().valid(10, 20, 50).default(20),
});

export const shopCategoryParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  categoryId: Joi.string().guid().required(),
});

export const shopProductParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  productId: Joi.string().guid().required(),
});

export const shopWebsiteParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const shopPaymentSchema = Joi.object({
  razorpayKeyId: Joi.string()
    .trim()
    .pattern(/^rzp_(test|live)_[A-Za-z0-9]+$/)
    .max(100)
    .required()
    .messages({ "string.pattern.base": 'Key ID starts with "rzp_test_" or "rzp_live_"' }),
  razorpayKeySecret: Joi.string().trim().allow("").max(200).optional(),
  razorpayWebhookSecret: Joi.string().trim().allow("").max(200).optional(),
});

export const shopRazorpayConnectSchema = Joi.object({
  /** App path to come back to after Razorpay, e.g. "/shop?website=…". */
  returnTo: Joi.string().trim().max(500).pattern(/^\/(?!\/)/).optional(),
});

export const shopWebhookParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
});

export const shopInventoryQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().valid(5, 10, 25, 50, 100).default(50),
});

export const shopInventoryLogQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopInventoryParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  variantId: Joi.string().guid().required(),
});

export const shopInventoryReturnsParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  productId: Joi.string().guid().required(),
});

export const shopInventoryAdjustSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(1_000_000).required().messages({
    "number.min": "Add at least 1",
    "number.max": "Quantity is too high",
    "number.base": "Enter how many to add",
  }),
  note: Joi.string().trim().max(300).allow("").optional(),
});

export const shopCustomerQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopCustomerParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  customerId: Joi.string().guid().required(),
});

const shopOrderStatus = Joi.string()
  .valid("pending", "paid", "processing", "shipped", "delivered", "failed", "cancelled", "returned")
  .required();

export const shopOrderQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  channel: Joi.string().valid("online", "pos").optional(),
  /** Orders placed on this day (IST), YYYY-MM-DD. */
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
  /** Orders placed from this day through `to` (IST, inclusive). */
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
  status: Joi.string()
    .valid("pending", "paid", "processing", "shipped", "delivered", "failed", "cancelled", "returned")
    .optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopPaymentLogQuerySchema = Joi.object({
  view: Joi.string().valid("owner", "technical").default("owner"),
  category: Joi.string().valid("payments", "refunds", "problems").optional(),
  kind: Joi.string().valid(...PAYMENT_LOG_KINDS).optional(),
  result: Joi.string().valid("success", "failure").optional(),
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopReturnQuerySchema = Joi.object({
  filter: Joi.string().valid("all", "awaiting", "in-progress", "refunded").default("all"),
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopOrderParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  orderId: Joi.string().guid().required(),
});

export const shopOrderStatusSchema = Joi.object({
  status: shopOrderStatus,
});

const shopOrderEmailStatus = Joi.string()
  .valid("paid", "processing", "shipped", "delivered", "failed", "cancelled", "returned")
  .required();

export const shopOrderEmailParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  status: shopOrderEmailStatus,
});

export const shopOrderEmailTemplateSchema = Joi.object({
  enabled: Joi.boolean().required(),
  subject: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Enter an email subject",
  }),
  heading: Joi.string().trim().min(1).max(160).required().messages({
    "string.empty": "Enter a title",
  }),
  message: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Enter a message",
  }),
});

export const shopOrderEmailDesignSchema = Joi.object({
  layout: Joi.string().valid("classic", "bold", "minimal", "banner", "postcard").required(),
  accentColor: Joi.string()
    .trim()
    .pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .required()
    .messages({ "string.pattern.base": "Choose a colour like #194a7a" }),
  showLogo: Joi.boolean().required(),
  logoMediaId: Joi.string().guid().allow(null).optional(),
});

export const shopInvoiceDesignSchema = Joi.object({
  layout: Joi.string().valid("classic", "minimal", "bold", "modern").required(),
  showLogo: Joi.boolean().required(),
  logoMediaId: Joi.string().guid().allow(null).optional(),
});

const shopCouponCode = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z0-9_-]{3,40}$/)
  .required()
  .messages({
    "string.pattern.base": "Use 3–40 letters, numbers, hyphens or underscores.",
  });

export const shopCouponParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  couponId: Joi.string().guid().required(),
});

export const shopCreateCouponSchema = Joi.object({
  code: shopCouponCode,
  discountType: Joi.string().valid("PERCENT", "FIXED_PAISE").required(),
  discountValue: Joi.number().integer().min(1).required(),
  productId: Joi.string().guid().allow(null).optional(),
  variantId: Joi.string().guid().allow(null).optional(),
  expiresAt: Joi.string().isoDate().allow(null, "").optional(),
  maxUses: Joi.number().integer().min(1).allow(null).optional(),
});

export const shopUpdateCouponSchema = Joi.object({
  discountType: Joi.string().valid("PERCENT", "FIXED_PAISE").optional(),
  discountValue: Joi.number().integer().min(1).optional(),
  productId: Joi.string().guid().allow(null).optional(),
  variantId: Joi.string().guid().allow(null).optional(),
  expiresAt: Joi.string().isoDate().allow(null, "").optional(),
  maxUses: Joi.number().integer().min(1).allow(null).optional(),
  active: Joi.boolean().optional(),
}).min(1);

const posPhone = Joi.string().trim().max(32).pattern(/^[+\d][\d\s-]*$/).allow("").messages({
  "string.pattern.base": "Enter a valid phone number",
});

export const shopPosSaleSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string().guid().required(),
        quantity: Joi.number().integer().min(1).max(10_000).required(),
      }),
    )
    .min(1)
    .max(200)
    .required()
    .messages({ "array.min": "Add at least one item." }),
  discount: Joi.object({
    type: Joi.string().valid("amount", "percent").required(),
    value: Joi.number().min(0).when("type", {
      is: "percent",
      then: Joi.number().max(100),
      otherwise: Joi.number().integer().max(100_000_000),
    }).required(),
  })
    .allow(null)
    .optional(),
  customer: Joi.object({
    customerId: Joi.string().guid().allow(null).optional(),
    name: Joi.string().trim().max(120).allow("").optional(),
    phone: posPhone.optional(),
    email: Joi.string().trim().lowercase().email().max(255).allow("").optional(),
  })
    .allow(null)
    .optional(),
  payment: Joi.object({
    method: Joi.string().valid("cash", "upi", "card", "razorpay_qr").required(),
    cashReceivedPaise: Joi.number().integer().min(0).max(100_000_000).allow(null).optional(),
    reference: Joi.string().trim().max(100).allow("").optional(),
  }).required(),
});

export const shopPosEmailSchema = Joi.object({
  to: Joi.string().trim().lowercase().email().max(255).allow("").optional(),
});

export const shopPosCatalogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(10_000).default(1),
  search: Joi.string().trim().max(120).allow("").optional(),
  categoryId: Joi.string().guid().allow("").optional(),
});

export const shopPosCodeParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  code: Joi.string().trim().min(1).max(64).required(),
});

export const shopPosStockQuerySchema = Joi.object({
  variants: Joi.string()
    .pattern(/^[0-9a-f-]{36}(,[0-9a-f-]{36}){0,199}$/i)
    .allow("")
    .default("")
    .messages({ "string.pattern.base": "Send up to 200 variant ids, comma separated" }),
});

export const shopPosSummaryQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({ "string.pattern.base": "Use YYYY-MM-DD" }),
});
