import Joi from "joi";

export const listAiUsageQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional().allow(null, ""),
  year: Joi.number().integer().min(2020).max(2100).optional().allow(null, ""),
  search: Joi.string().trim().max(100).optional().allow(""),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string()
    .valid("totalTokens", "estimatedCost", "totalRequests", "businessName", "lastUsedAt")
    .default("totalTokens"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

export const clientIdParamsSchema = Joi.object({
  clientId: Joi.string().guid().required(),
});

export const listClientCallsQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).empty("").allow(null).optional(),
  year: Joi.number().integer().min(2020).max(2100).empty("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});
