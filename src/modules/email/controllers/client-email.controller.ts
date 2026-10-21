import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError.js";
import { clientEmailService } from "../services/client-email.service.js";

function requireClient(req: Request): string {
  const clientId = req.user?.clientId;
  if (!clientId) throw new AppError(403, "This account is not linked to a client workspace.", "FORBIDDEN");
  return clientId;
}

export class ClientEmailController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await clientEmailService.get(requireClient(req)) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await clientEmailService.update(requireClient(req), req.body) });
    } catch (error) {
      next(error);
    }
  };

  sendTest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to } = req.body as { to: string };
      await clientEmailService.sendTest(requireClient(req), to);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}

export const clientEmailController = new ClientEmailController();
