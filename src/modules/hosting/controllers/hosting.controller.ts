import type { NextFunction, Request, Response } from "express";
import type { BillingCycle } from "../../../generated/prisma/enums.js";
import { hostingAdminService } from "../services/hosting-admin.service.js";
import { hostingService } from "../services/hosting.service.js";
import type { ClientOverviewQuery, CyclePriceInput, PaymentListQuery, SubscriptionListQuery } from "../types/hosting.types.js";

type WebsiteParams = { id: string };
type ClientParams = { clientId: string };

export class HostingController {
  get = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.getForWebsite(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.updatePlan(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  pay = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const { cycle } = req.body as { cycle: BillingCycle };
      res.json({ hosting: await hostingService.payFromWallet(req.params.id, cycle, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  collect = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.adminCollect(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ settings: await hostingAdminService.settings() });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ settings: await hostingAdminService.updateSettings(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  backfill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await hostingAdminService.backfill(req.body, req.user!));
    } catch (error) {
      next(error);
    }
  };

  clients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await hostingAdminService.listClients(req.query as unknown as ClientOverviewQuery));
    } catch (error) {
      next(error);
    }
  };

  clientHosting = async (req: Request<ClientParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingAdminService.clientHosting(req.params.clientId) });
    } catch (error) {
      next(error);
    }
  };

  updateClientPrices = async (req: Request<ClientParams>, res: Response, next: NextFunction) => {
    try {
      const prices = req.body as CyclePriceInput;
      res.json({ hosting: await hostingAdminService.updateClientPrices(req.params.clientId, prices, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  subscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await hostingAdminService.listSubscriptions(req.query as unknown as SubscriptionListQuery));
    } catch (error) {
      next(error);
    }
  };

  payments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await hostingAdminService.listPayments(req.query as unknown as PaymentListQuery));
    } catch (error) {
      next(error);
    }
  };

  paymentsCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await hostingAdminService.paymentsCsv(req.query as unknown as PaymentListQuery);
      const day = new Date().toISOString().slice(0, 10);
      res
        .type("text/csv; charset=utf-8")
        .setHeader("Content-Disposition", `attachment; filename="hosting-payments-${day}.csv"`)
        .send(`\uFEFF${csv}`);
    } catch (error) {
      next(error);
    }
  };
}

export const hostingController = new HostingController();
