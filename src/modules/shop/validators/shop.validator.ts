import Joi from "joi";

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
  options: Joi.array().items(optionSchema).max(4).required().messages({
    "array.max": "A combination can have at most 4 options",
  }),
  overrides: Joi.array()
    .items(Joi.object({ key: Joi.string().trim().min(1).max(500).required(), pricePaise }))
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
  categoryId: Joi.string().guid().required().messages({
    "string.guid": "Choose a category",
    "any.required": "Choose a category",
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

export const shopWebhookParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
});

export const shopInventoryQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
});

export const shopInventoryLogQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopInventoryParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  variantId: Joi.string().guid().required(),
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
  .valid("pending", "paid", "processing", "shipped", "delivered", "failed", "cancelled")
  .required();

export const shopOrderQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  status: Joi.string()
    .valid("pending", "paid", "processing", "shipped", "delivered", "failed", "cancelled")
    .optional(),
  page: Joi.number().integer().min(1).default(1),
});

export const shopOrderParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  orderId: Joi.string().guid().required(),
});

export const shopOrderStatusSchema = Joi.object({
  status: shopOrderStatus,
});
