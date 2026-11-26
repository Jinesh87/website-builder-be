import type { NextFunction, Request, Response } from "express";
import { shopSalesExportService } from "../services/shop-sales-export.service.js";
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

  /** The summary plus every paid order in the period, as a CSV download. */
  exportCsv = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const query = req.query as { date?: string; from?: string; to?: string };
      const { content, filename } = await shopSalesExportService.csv(req.params.id, query, req.user!);
      res
        .type("text/csv; charset=utf-8")
        .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        .send(`\uFEFF${content}`);
    } catch (error) {
      next(error);
    }
  };

  /** The same report as a printable A4 PDF. */
  exportPdf = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const query = req.query as { date?: string; from?: string; to?: string };
      const { content, filename } = await shopSalesExportService.pdf(req.params.id, query, req.user!);
      res.type("application/pdf").setHeader("Content-Disposition", `attachment; filename="${filename}"`).send(content);
    } catch (error) {
      next(error);
    }
  };
}

export const shopSalesController = new ShopSalesController();
