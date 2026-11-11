import type { NextFunction, Request, Response } from "express";
import type { SubscriptionConfirmation } from "../../wallet/services/autopay.js";
import { hostingAdminService } from "../services/hosting-admin.service.js";
import { hostingAutopayService } from "../services/hosting-autopay.service.js";
import { hostingCheckoutService } from "../services/hosting-checkout.service.js";
import { hostingCouponService } from "../services/hosting-coupon.service.js";
import { hostingService } from "../services/hosting.service.js";
import type {
  ClientOverviewQuery,
  CreateHostingCouponInput,
  PaymentListQuery,
  PlanChoice,
  RazorpayConfirmation,
  SubscriptionListQuery,
  UpdateHostingCouponInput,
} from "../types/hosting.types.js";

type WebsiteParams = { id: string };
type ClientParams = { clientId: string };
type PackageParams = { packageId: string };
type CouponParams = { couponId: string };

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

  previewCoupon = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({
        preview: await hostingCouponService.previewForWebsite(req.params.id, req.body, req.user!),
      });
    } catch (error) {
      next(error);
    }
  };

  listCoupons = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ coupons: await hostingCouponService.listCoupons() });
    } catch (error) {
      next(error);
    }
  };

  createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ coupon: await hostingCouponService.createCoupon(req.body as CreateHostingCouponInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateCoupon = async (req: Request<CouponParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ coupon: await hostingCouponService.updateCoupon(req.params.couponId, req.body as UpdateHostingCouponInput) });
    } catch (error) {
      next(error);
    }
  };

  listCouponRedemptions = async (req: Request<CouponParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ redemptions: await hostingCouponService.listRedemptions(req.params.couponId) });
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

  grantFreePeriod = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.grantFreePeriod(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  unrecordPayment = async (req: Request<WebsiteParams & { paymentId: string }>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingService.unrecordPayment(req.params.id, req.params.paymentId, req.user!) });
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

  updateClientBackupPolicy = async (req: Request<ClientParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingAdminService.updateClientBackupPolicy(req.params.clientId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateClientStoragePolicy = async (req: Request<ClientParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ hosting: await hostingAdminService.updateClientStoragePolicy(req.params.clientId, req.body, req.user!) });
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
