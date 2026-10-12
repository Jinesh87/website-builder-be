import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError.js";
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

  createTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, userId } = requireClient(req);
      const { amountPaise } = req.body as { amountPaise: number };
      res.status(201).json({ checkout: await walletService.createTopup(clientId, userId, amountPaise) });
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
      await walletService.handleWebhook(rawBody, req.header("x-razorpay-signature"));
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

  getConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await paymentSettingsService.getConfigView() });
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
