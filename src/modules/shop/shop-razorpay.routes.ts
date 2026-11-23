import express, { Router } from "express";
import Joi from "joi";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { shopRazorpayConnectController } from "./controllers/shop-razorpay-connect.controller.js";

const callbackQuerySchema = Joi.object({
  code: Joi.string().max(2000).optional(),
  state: Joi.string().max(4000).optional(),
  error: Joi.string().max(200).optional(),
  error_description: Joi.string().max(500).allow("").optional(),
}).unknown(true);

/** Public: Razorpay sends the shop owner's browser back here after "Connect with Razorpay". */
export const shopRazorpayOAuthRouter = Router();
shopRazorpayOAuthRouter.get(
  "/callback",
  rateLimit({ name: "shop-razorpay-oauth-callback", max: 60, windowSeconds: 60 * 60 }),
  validate(callbackQuerySchema, "query"),
  shopRazorpayConnectController.callback,
);

/** Public. The partner app's single webhook; mounted before express.json() so the signature covers the raw body. */
export const shopRazorpayPartnerWebhookRouter = Router();
shopRazorpayPartnerWebhookRouter.post(
  "/",
  express.raw({ type: "*/*", limit: "1mb" }),
  shopRazorpayConnectController.partnerWebhook,
);
