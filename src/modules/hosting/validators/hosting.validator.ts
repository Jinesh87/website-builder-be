import Joi from "joi";

/** Paise per period: up to ₹1 crore. */
const MAX_PRICE_PAISE = 1_000_000_000;
const paise = Joi.number().integer().min(0).max(MAX_PRICE_PAISE);
const cycle = Joi.string().valid("QUARTERLY", "YEARLY");
const packageId = Joi.string().uuid();
const isoDay = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ "string.pattern.base": "Use a date like 2026-04-10" });
const razorpayId = Joi.string().trim().max(64).pattern(/^[A-Za-z0-9_]+$/).required();

export const websiteParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const clientParamsSchema = Joi.object({
  clientId: Joi.string().uuid().required(),
});

export const packageParamsSchema = Joi.object({
  packageId: packageId.required(),
});

export const planChoiceSchema = Joi.object({
  packageId: packageId.required(),
  cycle: cycle.required(),
});

export const confirmCheckoutSchema = Joi.object({
  razorpayOrderId: razorpayId,
  razorpayPaymentId: razorpayId,
  razorpaySignature: Joi.string().trim().hex().max(128).required(),
});

export const confirmAutopaySchema = Joi.object({
  razorpaySubscriptionId: razorpayId,
  razorpayPaymentId: razorpayId,
  razorpaySignature: Joi.string().trim().hex().max(128).required(),
});

export const updatePlanSchema = Joi.object({
  packageId: packageId.optional(),
  cycle: cycle.optional(),
  autoRenew: Joi.boolean().optional(),
  customQuarterlyPaise: paise.allow(null).optional(),
  customYearlyPaise: paise.allow(null).optional(),
}).min(1);

export const collectHostingSchema = Joi.object({
  packageId: packageId.required(),
  cycle: cycle.required(),
  method: Joi.string().valid("WALLET", "CASH", "UPI", "BANK_TRANSFER").required(),
  reference: Joi.string().trim().max(120).allow("").optional(),
  note: Joi.string().trim().max(500).allow("").optional(),
});

export const updateSettingsSchema = Joi.object({
  enabled: Joi.boolean().required(),
  allowConnectsPayment: Joi.boolean().required(),
  reminderDays: Joi.number().integer().min(0).max(60).required(),
  graceDays: Joi.number().integer().min(0).max(60).required(),
});

export const updatePackageSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  description: Joi.string().trim().min(1).max(300).required(),
  features: Joi.array().items(Joi.string().trim().min(1).max(120)).max(20).required(),
  quarterlyPricePaise: paise.required(),
  yearlyPricePaise: paise.required(),
  startingQuarterlyPaise: paise.optional(),
  startingYearlyPaise: paise.optional(),
  featured: Joi.boolean().required(),
  active: Joi.boolean().required(),
});

export const backfillSchema = Joi.object({
  freeDays: Joi.number().integer().min(1).max(366).required(),
  packageId: packageId.required(),
  cycle: cycle.required(),
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
  method: Joi.string().valid("WALLET", "CASH", "UPI", "BANK_TRANSFER", "RAZORPAY").allow("").optional(),
  paidBy: Joi.string().valid("CLIENT", "ADMIN", "SYSTEM").allow("").optional(),
};

export const paymentsQuerySchema = Joi.object({
  ...paymentFilters,
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

export const paymentsCsvQuerySchema = Joi.object(paymentFilters);
