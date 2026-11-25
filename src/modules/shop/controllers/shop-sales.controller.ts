import type { NextFunction, Request, Response } from "express";
import { shopSalesReportsService } from "../services/shop-sales-reports.service.js";

type WebsiteParams = { id: string };

/** Sales reports across the online store and the POS till. Mounted under /api/websites/:id/shop/sales. */
export class ShopSalesController {
  summary = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const query = req.query as { date?: string; from?: string; to?: string };
      res.json({ summary: await shopSalesReportsService.summary(req.params.id, query, req.user!) });
    } catch (error) {
      next(error);
    }
  };
}

export const shopSalesController = new ShopSalesController();
