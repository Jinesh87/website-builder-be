import Joi from "joi";
import { password } from "../../auth/validators/auth.validator.js";

const email = Joi.string().trim().lowercase().email().max(255);

const verificationCode = Joi.string()
  .trim()
  .pattern(/^\d{6}$/)
  .messages({ "string.pattern.base": "Enter the 6-digit code" });

const phone = Joi.string()
  .trim()
  .pattern(/^\+?[0-9 ()-]{7,20}$/)
  .allow("")
  .optional()
  .messages({ "string.pattern.base": "Enter a valid phone number" });

export const shopAuthWebsiteParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
});

export const shopSignupSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: email.required(),
  password: password.required(),
  phone: phone,
});

export const shopVerifyEmailSchema = Joi.object({
  email: email.required(),
  code: verificationCode.required(),
});

export const shopEmailOnlySchema = Joi.object({
  email: email.required(),
});

export const shopLoginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().min(1).max(200).required(),
  remember: Joi.boolean().default(true),
});

export const shopResetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(20).max(200).required(),
  password: password.required(),
});

export const shopProfileUpdateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).optional(),
  phone: phone,
})
  .min(1)
  .messages({ "object.min": "Add at least one profile field to update" });

const addressPhone = Joi.string()
  .trim()
  .pattern(/^\+?[0-9 ()-]{7,20}$/)
  .required()
  .messages({ "string.pattern.base": "Enter a valid phone number" });

export const shopAddressSchema = Joi.object({
  label: Joi.string().trim().max(40).allow("").optional(),
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: addressPhone,
  line1: Joi.string().trim().min(3).max(200).required().messages({
    "string.min": "Enter a street address",
  }),
  line2: Joi.string().trim().max(200).allow("").optional(),
  city: Joi.string().trim().min(2).max(80).required(),
  state: Joi.string().trim().min(2).max(80).required(),
  postalCode: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9][A-Za-z0-9 \-]{2,18}[A-Za-z0-9]$/)
    .required()
    .messages({ "string.pattern.base": "Enter a valid PIN / postal code" }),
  country: Joi.string().trim().uppercase().length(2).default("IN"),
  isDefault: Joi.boolean().optional(),
});

export const shopGuestAddressSchema = shopAddressSchema.keys({
  email: email.required(),
});

export const shopAddressParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  addressId: Joi.string().guid().required(),
});

export const shopChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).required(),
  newPassword: password.required(),
});

export const shopAddToCartSchema = Joi.object({
  variantId: Joi.string().guid().required(),
  quantity: Joi.number().integer().min(1).max(99).default(1),
});

export const shopUpdateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(99).required(),
});

export const shopCartItemParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  itemId: Joi.string().guid().required(),
});

export const shopProductParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  variantId: Joi.string().guid().required(),
});

export const shopAddToWishlistSchema = Joi.object({
  variantId: Joi.string().guid().required(),
});

const razorpayId = Joi.string().trim().max(64).pattern(/^[A-Za-z0-9_]+$/).required();

export const shopCheckoutStartSchema = Joi.object({
  addressId: Joi.string().guid().required().messages({
    "any.required": "Choose a delivery address before paying.",
    "string.guid": "Choose a delivery address before paying.",
  }),
  couponCode: Joi.string().trim().max(40).allow("").optional(),
});

export const shopGuestCheckoutStartSchema = Joi.object({
  email: email.required(),
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: addressPhone,
  address: shopAddressSchema.required(),
  couponCode: Joi.string().trim().max(40).allow("").optional(),
});

export const shopCouponPreviewSchema = Joi.object({
  couponCode: Joi.string().trim().min(3).max(40).required().messages({
    "any.required": "Enter a coupon code.",
    "string.min": "Enter a coupon code.",
  }),
});

export const shopTrackParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  token: Joi.string().trim().min(20).max(80).required(),
});

export const shopCheckoutConfirmSchema = Joi.object({
  razorpayOrderId: razorpayId,
  razorpayPaymentId: razorpayId,
  razorpaySignature: Joi.string().trim().hex().max(128).required(),
});

export const shopOrderParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  orderId: Joi.string().guid().required(),
});

export const shopCancelOrderSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "string.min": "Please share a short reason (at least 3 characters).",
    "any.required": "Please share why you are cancelling.",
  }),
});

export const shopReturnOrderSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "string.min": "Please share a short reason (at least 3 characters).",
    "any.required": "Please share why you are returning this order.",
  }),
});
