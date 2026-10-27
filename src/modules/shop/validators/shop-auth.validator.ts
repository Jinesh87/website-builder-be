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
  remember: Joi.boolean().default(false),
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

export const shopChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).required(),
  newPassword: password.required(),
});
