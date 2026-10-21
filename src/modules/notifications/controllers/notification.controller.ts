import type { NextFunction, Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";

type IdParams = { id: string };

export class NotificationController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query as unknown as { limit: number };
      res.json(await notificationService.list(req.user!, limit));
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await notificationService.markRead(req.user!, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAllRead(req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
