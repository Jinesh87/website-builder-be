import express, { Router } from "express";
import Joi from "joi";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { walletController } from "./controllers/wallet.controller.js";
import { CONNECTS_PACK_SIZE, MAX_PURCHASE_CONNECTS, MIN_PURCHASE_CONNECTS } from "./services/wallet.service.js";

const transactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const createTopupSchema = Joi.object({
  connects: Joi.number()
    .integer()
    .multiple(CONNECTS_PACK_SIZE)
    .min(MIN_PURCHASE_CONNECTS)
    .max(MAX_PURCHASE_CONNECTS)
    .required()
    .messages({ "number.multiple": `Connects are sold in multiples of ${CONNECTS_PACK_SIZE}` }),
});

const razorpayId = Joi.string().trim().max(64).pattern(/^[A-Za-z0-9_]+$/).required();
const confirmTopupSchema = Joi.object({
  razorpayOrderId: razorpayId,
  razorpayPaymentId: razorpayId,
  razorpaySignature: Joi.string().trim().hex().max(128).required(),
});

const updatePaymentConfigSchema = Joi.object({
  razorpayKeyId: Joi.string()
    .trim()
    .pattern(/^rzp_(test|live)_[A-Za-z0-9]+$/)
    .max(100)
    .required()
    .messages({ "string.pattern.base": 'Key ID starts with "rzp_test_" or "rzp_live_"' }),
  razorpayKeySecret: Joi.string().trim().allow("").max(200).optional(),
  razorpayWebhookSecret: Joi.string().trim().allow("").max(200).optional(),
});

/** Client users: their workspace's connects. */
export const walletRouter = Router();
walletRouter.use(authenticate, authorize(UserRole.CLIENT));
walletRouter.get("/", walletController.get);
walletRouter.get("/transactions", validate(transactionsQuerySchema, "query"), walletController.transactions);
walletRouter.post(
  "/topups",
  rateLimit({ name: "wallet-topup", max: 20, windowSeconds: 60 * 60 }),
  validate(createTopupSchema),
  walletController.createTopup,
);
walletRouter.post("/topups/verify", validate(confirmTopupSchema), walletController.confirmTopup);

/** Super admin: Razorpay keys. */
export const paymentSettingsRouter = Router();
paymentSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
paymentSettingsRouter.get("/", walletController.getConfig);
paymentSettingsRouter.put("/", validate(updatePaymentConfigSchema), walletController.updateConfig);
paymentSettingsRouter.get(
  "/secrets",
  rateLimit({ name: "payment-secrets-reveal", max: 20, windowSeconds: 60 * 60 }),
  walletController.revealSecrets,
);

const updateBillingSchema = Joi.object({
  margin: Joi.number().min(0).max(1000).precision(2).required(),
  minBalance: Joi.number().min(0).max(1_000_000).precision(3).required(),
});

/** Super admin: USD→INR rate and the margin added to it for AI usage. */
export const billingSettingsRouter = Router();
billingSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
billingSettingsRouter.get("/", walletController.getBilling);
billingSettingsRouter.put("/", validate(updateBillingSchema), walletController.updateBilling);
billingSettingsRouter.post(
  "/refresh-rate",
  rateLimit({ name: "billing-refresh-rate", max: 10, windowSeconds: 60 * 60 }),
  walletController.refreshRate,
);

const adminListQuery = {
  search: Joi.string().trim().max(100).allow("").optional(),
  month: Joi.number().integer().min(1).max(12).allow("").optional(),
  year: Joi.number().integer().min(2020).max(2100).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
};
const adminTransactionsQuerySchema = Joi.object({
  ...adminListQuery,
  type: Joi.string().valid("CREDIT", "DEBIT").allow("").optional(),
  source: Joi.string().valid("TOPUP", "AI_USAGE", "ADJUSTMENT").allow("").optional(),
});
const adminPaymentsQuerySchema = Joi.object({
  ...adminListQuery,
  status: Joi.string().valid("CREATED", "PAID", "FAILED").allow("").optional(),
});

/** Super admin: every client's wallet activity. */
export const adminWalletRouter = Router();
adminWalletRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
adminWalletRouter.get("/transactions", validate(adminTransactionsQuerySchema, "query"), walletController.adminTransactions);
adminWalletRouter.get("/payments", validate(adminPaymentsQuerySchema, "query"), walletController.adminPayments);

/** Razorpay server-to-server; mounted before express.json() because the signature covers the raw body. */
export const razorpayWebhookRouter = Router();
razorpayWebhookRouter.post("/", express.raw({ type: "*/*", limit: "1mb" }), walletController.webhook);
