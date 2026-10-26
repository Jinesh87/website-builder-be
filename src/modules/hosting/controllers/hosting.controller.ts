import type { NextFunction, Request, Response } from "express";
import type { SubscriptionConfirmation } from "../../wallet/services/autopay.js";
import { hostingAdminService } from "../services/hosting-admin.service.js";
import { hostingAutopayService } from "../services/hosting-autopay.service.js";
import { hostingCheckoutService } from "../services/hosting-checkout.service.js";
import { hostingService } from "../services/hosting.service.js";
import type {
  ClientOverviewQuery,
  PaymentListQuery,
  PlanChoice,
  RazorpayConfirmation,
  SubscriptionListQuery,
} from "../types/hosting.types.js";

type WebsiteParams = { id: string };
type ClientParams = { clientId: string };
type PackageParams = { packageId: string };

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
      const hosting = await hostingService.updatePlan(req.params.id, req.body, req.user!);
      const autopayStopped = await hostingAutopayService.afterPlanChange(req.params.id);
      res.json({ hosting: autopayStopped ? await hostingService.getForWebsite(req.params.id, req.user!) : hosting });
    } catch (error) {
      next(error);
    }
  };

  setupAutopay = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ checkout: await hostingAutopayService.setup(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  confirmAutopay = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const input = req.body as SubscriptionConfirmation;
      res.json({ hosting: await hostingAutopayService.confirm(req.params.id, input, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  cancelAutopay = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingAutopayService.cancel(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  checkout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await hostingCheckoutService.createCheckout(req.params.id, req.body as PlanChoice, req.user!));
    } catch (error) {
      next(error);
    }
  };

  confirmCheckout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const input = req.body as RazorpayConfirmation;
      res.json({ hosting: await hostingCheckoutService.confirm(req.params.id, input, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  payWithConnects = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.payWithConnects(req.params.id, req.body as PlanChoice, req.user!) });
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

  publicPricing = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ pricing: await hostingService.publicPricing() });
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

  updatePackage = async (req: Request<PackageParams>, res: Response, next: NextFunction) => {
    try {
      const settings = await hostingAdminService.updatePackage(req.params.packageId, req.body, req.user!);
      await hostingAutopayService.afterPackageChange(req.params.packageId);
      res.json({ settings });
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
