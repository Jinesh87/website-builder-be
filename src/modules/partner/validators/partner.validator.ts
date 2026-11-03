import Joi from "joi";

const email = Joi.string().trim().lowercase().email().max(255);
const phone = Joi.string().trim().min(7).max(32);

export const partnerApplicationSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(160).required(),
  registrationNumber: Joi.string().trim().max(60).allow("", null).optional(),
  website: Joi.string().trim().uri({ scheme: [/https?/] }).max(255).allow("", null).optional(),
  businessType: Joi.string()
    .trim()
    .valid("IT Company", "Digital Agency", "Consultancy", "Education", "Individual", "Other")
    .required(),
  yearEstablished: Joi.string().trim().min(2).max(10).required(),
  country: Joi.string().trim().min(2).max(80).required(),
  state: Joi.string().trim().min(2).max(80).required(),
  city: Joi.string().trim().min(2).max(80).required(),
  businessAddress: Joi.string().trim().min(5).max(500).required(),

  contactName: Joi.string().trim().min(2).max(120).required(),
  designation: Joi.string().trim().min(2).max(100).required(),
  email: email.required(),
  phone: phone.required(),
  alternatePhone: phone.allow("", null).optional(),

  partnershipType: Joi.string()
    .trim()
    .valid("Referral Partner", "Reseller Partner", "Agency Partner", "Affiliate")
    .default("Referral Partner")
    .optional(),
  targetCategories: Joi.array().items(Joi.string().trim().max(50)).min(1).required(),
  expectedReferrals: Joi.string()
    .trim()
    .valid("1 - 5", "6 - 15", "16 - 30", "30+")
    .required(),
  marketingChannels: Joi.array().items(Joi.string().trim().max(50)).min(1).required(),
  reason: Joi.string().trim().min(10).max(2000).required(),
  previousExperience: Joi.boolean().default(false),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the Partner Terms and Privacy Policy",
  }),
});

export const adminPartnerApproveSchema = Joi.object({
  commissionRate: Joi.number().min(1).max(100).precision(2).default(15.0),
  commissionPolicy: Joi.string()
    .valid("GLOBAL_DEFAULT", "FIRST_PAYMENT", "EVERY_RENEWAL")
    .default("GLOBAL_DEFAULT")
    .optional(),
  customReferralCode: Joi.string().trim().uppercase().min(3).max(30).optional(),
  temporaryPassword: Joi.string().trim().min(6).max(72).optional(),
});

export const adminPartnerRejectSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(1000).required(),
});

export const adminPartnerSuspendSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(1000).required(),
});

export const adminPartnerCommissionUpdateSchema = Joi.object({
  commissionRate: Joi.number().min(1).max(100).precision(2).optional(),
  isCommissionActive: Joi.boolean().optional(),
  commissionPolicy: Joi.string()
    .valid("GLOBAL_DEFAULT", "FIRST_PAYMENT", "EVERY_RENEWAL")
    .optional(),
}).or("commissionRate", "isCommissionActive", "commissionPolicy");

export const adminPartnerProgramConfigSchema = Joi.object({
  defaultCommissionRate: Joi.number().min(1).max(100).precision(2).optional(),
  defaultCommissionPolicy: Joi.string()
    .valid("FIRST_PAYMENT", "EVERY_RENEWAL")
    .optional(),
}).or("defaultCommissionRate", "defaultCommissionPolicy");

export const adminCommissionStatusSchema = Joi.object({
  status: Joi.string().valid("PENDING", "APPROVED", "PAID", "CANCELLED").required(),
  paymentReference: Joi.string().trim().max(120).allow("", null).optional(),
  notes: Joi.string().trim().max(500).allow("", null).optional(),
});

export const adminPartnerQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  status: Joi.string().valid("ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED").default("ALL"),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

export const adminAuditLogQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

