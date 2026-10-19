import Joi from "joi";

const email = Joi.string().trim().lowercase().email().max(255);

/** bcrypt only uses the first 72 bytes, so cap the length there. */
export const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, "letter")
  .pattern(/\d/, "number")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 72 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  });

/** Lowercase, no "@" (so login can tell it apart from an email), 3–40 characters. */
export const username = Joi.string()
  .trim()
  .lowercase()
  .min(3)
  .max(40)
  .pattern(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/)
  .messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must be at most 40 characters",
    "string.pattern.base":
      "Use lowercase letters, numbers, dots, dashes or underscores, starting and ending with a letter or number",
  });

export const signupSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  businessName: Joi.string().trim().min(2).max(160).required(),
  email: email.required(),
  password: password.required(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9 ()-]{7,20}$/)
    .allow("")
    .optional()
    .messages({ "string.pattern.base": "Enter a valid phone number" }),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the Terms of Service and Privacy Policy",
  }),
});

export const verifyEmailSchema = Joi.object({
  email: email.required(),
  code: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({ "string.pattern.base": "Enter the 6-digit code" }),
});

export const emailOnlySchema = Joi.object({
  email: email.required(),
});

/** `identifier` is an email or a username; the legacy `email` key is still accepted. */
export const loginSchema = Joi.object({
  identifier: Joi.string().trim().lowercase().min(1).max(255).required().messages({
    "any.required": "Email or username is required",
    "string.empty": "Email or username is required",
  }),
  password: Joi.string().min(1).max(200).required(),
  remember: Joi.boolean().default(false),
}).rename("email", "identifier", { ignoreUndefined: true });

export const changePasswordSchema = Joi.object({
  newPassword: password.required(),
});

export const resetPasswordQuerySchema = Joi.object({
  token: Joi.string().trim().min(20).max(200).required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(20).max(200).required(),
  password: password.required(),
});
