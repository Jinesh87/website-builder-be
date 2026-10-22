import Joi from "joi";
import { ClientSource, UserStatus } from "../../../common/constants/roles.js";
import { password, username } from "../../auth/validators/auth.validator.js";

const clientDetails = {
  businessName: Joi.string().trim().min(2).max(160).required(),
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9 ()-]{7,20}$/)
    .allow("")
    .optional()
    .messages({ "string.pattern.base": "Enter a valid phone number" }),
  address: Joi.string().trim().max(500).allow("").optional(),
};

/** Optional because admin-created clients log in with their username; the service enforces it for email logins. */
const optionalEmail = Joi.string().trim().lowercase().email().max(255).allow("").optional();

export const listClientsQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  source: Joi.string()
    .valid(...Object.values(ClientSource))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

export const clientIdParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const createClientSchema = Joi.object({
  ...clientDetails,
  email: optionalEmail,
  username: username.required(),
  password: password.required(),
});

export const updateClientSchema = Joi.object({
  ...clientDetails,
  email: optionalEmail,
  username: username.optional(),
});

export const setClientPasswordSchema = Joi.object({
  password: password.required(),
});

export const setShopFeatureSchema = Joi.object({
  shopFeatureEnabled: Joi.boolean().required(),
});
