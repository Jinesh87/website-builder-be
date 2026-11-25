import type { NextFunction, Request, Response } from "express";
import { logger } from "../../../config/logger.js";
import {
  razorpayPartnerSettingsService,
  type UpdateRazorpayPartnerInput,
} from "../services/razorpay-partner-settings.service.js";

/** Super Admin: the platform's Razorpay Technology Partner app. */
export const razorpayPartnerController = {
  get: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ partner: await razorpayPartnerSettingsService.getView() });
    } catch (error) {
      next(error);
    }
  },

  revealSecrets: async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.warn({ userId: req.user?.id }, "Razorpay partner app secrets revealed");
      const mode = req.query.mode === "test" ? "test" : "live";
      res.json({ secrets: await razorpayPartnerSettingsService.revealSecrets(mode) });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ partner: await razorpayPartnerSettingsService.update(req.body as UpdateRazorpayPartnerInput) });
    } catch (error) {
      next(error);
    }
  },
};
