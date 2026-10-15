import type { NextFunction, Request, Response } from "express";
import { aiPricingService, type AiModelPriceInput } from "../services/ai-pricing.service.js";
import { aiSettingsService } from "../services/ai-settings.service.js";

export class AiSettingsController {
  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiSettingsService.getConfigView();
      res.json({ config });
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiSettingsService.updateConfig(req.body);
      res.json({ config });
    } catch (error) {
      next(error);
    }
  };

  getPricing = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ prices: await aiPricingService.list() });
    } catch (error) {
      next(error);
    }
  };

  updatePricing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prices } = req.body as { prices: AiModelPriceInput[] };
      res.json({ prices: await aiPricingService.update(prices) });
    } catch (error) {
      next(error);
    }
  };
}

export const aiSettingsController = new AiSettingsController();
