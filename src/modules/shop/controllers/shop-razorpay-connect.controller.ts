import type { NextFunction, Request, Response } from "express";
import { shopPaymentService } from "../services/shop-payment.service.js";
import { handleShopPartnerWebhook } from "../services/shop-razorpay-partner-webhook.js";
import { shopRazorpayOAuthService, type RazorpayCallbackQuery } from "../services/shop-razorpay-oauth.service.js";

type WebsiteParams = { id: string };

/** "Connect with Razorpay": the shop owner's Razorpay account linked through the platform's partner app. */
export const shopRazorpayConnectController = {
  start: async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const { returnTo } = req.body as { returnTo?: string };
      res.json(await shopRazorpayOAuthService.startConnect(req.params.id, req.user!, returnTo));
    } catch (error) {
      next(error);
    }
  },

  disconnect: async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopRazorpayOAuthService.disconnect(req.params.id, req.user!);
      res.json({ config: await shopPaymentService.getConfig(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  },

  /** Checks again whether Razorpay QR codes work for the shop, e.g. after the owner turned them on. */
  checkQrCodes: async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await shopPaymentService.recheckQrCodes(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  },

  /** Razorpay redirects the shop owner's browser here; we send them back to the app. */
  callback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.redirect(302, await shopRazorpayOAuthService.handleCallback(req.query as RazorpayCallbackQuery));
    } catch (error) {
      next(error);
    }
  },

  partnerWebhook: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      await handleShopPartnerWebhook(rawBody, req.header("x-razorpay-signature"));
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
};
