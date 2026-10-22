import type { NextFunction, Request, Response } from "express";
import { aiPricingService, type AiModelPriceInput } from "../../admin-settings/services/ai-pricing.service.js";
import { clientService } from "../services/client.service.js";
import type { ClientListQuery } from "../types/client.types.js";

type IdParams = { id: string };

export class ClientController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await clientService.list(req.query as unknown as ClientListQuery));
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ client: await clientService.get(req.params.id) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await clientService.create(req.body, req.user!.id));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ client: await clientService.update(req.params.id, req.body, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  setShopFeature = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const { shopFeatureEnabled } = req.body as { shopFeatureEnabled: boolean };
      res.json({ client: await clientService.setShopFeature(req.params.id, shopFeatureEnabled, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  suspend = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ client: await clientService.suspend(req.params.id, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  reactivate = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ client: await clientService.reactivate(req.params.id, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  aiPrices = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ prices: await aiPricingService.listForClient(req.params.id) });
    } catch (error) {
      next(error);
    }
  };

  updateAiPrices = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const { prices } = req.body as { prices: AiModelPriceInput[] };
      res.json({ prices: await aiPricingService.updateForClient(req.params.id, prices) });
    } catch (error) {
      next(error);
    }
  };

  setPassword = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ client: await clientService.setPassword(req.params.id, req.body.password, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  resendEmail = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await clientService.resendEmail(req.params.id));
    } catch (error) {
      next(error);
    }
  };
}

export const clientController = new ClientController();
