import Joi from "joi";

/** Connects per period. */
const MAX_PRICE = 10_000_000;
const price = Joi.number().integer().min(0).max(MAX_PRICE);
const cycle = Joi.string().valid("QUARTERLY", "YEARLY");
const isoDay = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ "string.pattern.base": "Use a date like 2026-04-10" });

export const websiteParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const clientParamsSchema = Joi.object({
  clientId: Joi.string().uuid().required(),
});

export const payHostingSchema = Joi.object({
  cycle: cycle.required(),
});

export const updatePlanSchema = Joi.object({
  cycle: cycle.optional(),
  autoRenew: Joi.boolean().optional(),
  quarterlyPrice: price.allow(null).optional(),
  yearlyPrice: price.allow(null).optional(),
}).min(1);

export const collectHostingSchema = Joi.object({
  cycle: cycle.required(),
  method: Joi.string().valid("WALLET", "CASH", "UPI", "BANK_TRANSFER").required(),
  reference: Joi.string().trim().max(120).allow("").optional(),
  note: Joi.string().trim().max(500).allow("").optional(),
});

export const updateSettingsSchema = Joi.object({
  enabled: Joi.boolean().required(),
  quarterlyPrice: price.required(),
  yearlyPrice: price.required(),
  reminderDays: Joi.number().integer().min(0).max(60).required(),
  graceDays: Joi.number().integer().min(0).max(60).required(),
});

export const backfillSchema = Joi.object({
  freeDays: Joi.number().integer().min(1).max(366).required(),
  cycle: cycle.required(),
});

export const clientPricesSchema = Joi.object({
  quarterlyPrice: price.allow(null).required(),
  yearlyPrice: price.allow(null).required(),
});

export const subscriptionsQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  status: Joi.string().valid("AWAITING_PAYMENT", "ACTIVE", "GRACE", "SUSPENDED").allow("").optional(),
  dueWithinDays: Joi.number().integer().min(0).max(366).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

export const clientsOverviewQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  attention: Joi.string().valid("DUE_SOON", "GRACE", "SUSPENDED", "NO_PLAN").allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const paymentFilters = {
  search: Joi.string().trim().max(100).allow("").optional(),
  websiteId: Joi.string().uuid().allow("").optional(),
  from: isoDay.allow("").optional(),
  to: isoDay.allow("").optional(),
  method: Joi.string().valid("WALLET", "CASH", "UPI", "BANK_TRANSFER").allow("").optional(),
  paidBy: Joi.string().valid("CLIENT", "ADMIN", "SYSTEM").allow("").optional(),
};

export const paymentsQuerySchema = Joi.object({
  ...paymentFilters,
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

export const paymentsCsvQuerySchema = Joi.object(paymentFilters);
