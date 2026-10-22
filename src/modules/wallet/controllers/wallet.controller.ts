import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { hostingCheckoutService } from "../../hosting/services/hosting-checkout.service.js";
import { aiBillingService } from "../services/ai-billing.service.js";
import { adminWalletService, type AdminPaymentQuery, type AdminTransactionQuery } from "../services/admin-wallet.service.js";
import { paymentSettingsService } from "../services/payment-settings.service.js";
import { walletService } from "../services/wallet.service.js";

function requireClient(req: Request): { clientId: string; userId: string } {
  const clientId = req.user?.clientId;
  if (!clientId || !req.user) throw new AppError(403, "This account is not linked to a client workspace.", "FORBIDDEN");
  return { clientId, userId: req.user.id };
}

export class WalletController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ wallet: await walletService.getWallet(requireClient(req).clientId) });
    } catch (error) {
      next(error);
    }
  };

  transactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      res.json(await walletService.listTransactions(requireClient(req).clientId, page, pageSize));
    } catch (error) {
      next(error);
    }
  };

  /** Defaults to the current month. */
  usage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, month } = req.query as unknown as { year?: number; month?: number | null };
      const now = new Date();
      const usage = await aiBillingService.usageSummary(
        requireClient(req).clientId,
        year ?? now.getUTCFullYear(),
        year === undefined ? now.getUTCMonth() + 1 : (month ?? null),
      );
      res.json({ usage });
    } catch (error) {
      next(error);
    }
  };

  createTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, userId } = requireClient(req);
      const { connects } = req.body as { connects: number };
      res.status(201).json({ checkout: await walletService.createTopup(clientId, userId, connects) });
    } catch (error) {
      next(error);
    }
  };

  confirmTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await walletService.confirmTopup(requireClient(req).clientId, req.body));
    } catch (error) {
      next(error);
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const event = await walletService.verifyWebhook(rawBody, req.header("x-razorpay-signature"));
      if (!(await walletService.applyWebhook(event))) await hostingCheckoutService.applyWebhook(event);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  adminTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminWalletService.listTransactions(req.query as unknown as AdminTransactionQuery));
    } catch (error) {
      next(error);
    }
  };

  adminPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminWalletService.listPayments(req.query as unknown as AdminPaymentQuery));
    } catch (error) {
      next(error);
    }
  };

  getBilling = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ billing: await aiBillingService.settings() });
    } catch (error) {
      next(error);
    }
  };

  updateBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { margin, minBalance } = req.body as { margin: number; minBalance: number };
      res.json({ billing: await aiBillingService.updateSettings(margin, minBalance) });
    } catch (error) {
      next(error);
    }
  };

  refreshRate = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ billing: await aiBillingService.refreshRate() });
    } catch (error) {
      next(error);
    }
  };

  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await paymentSettingsService.getConfigView() });
    } catch (error) {
      next(error);
    }
  };

  revealSecrets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.warn({ userId: req.user?.id }, "Razorpay secrets revealed in settings");
      res.json({ secrets: await paymentSettingsService.revealSecrets() });
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await paymentSettingsService.updateConfig(req.body) });
    } catch (error) {
      next(error);
    }
  };
}

export const walletController = new WalletController();
