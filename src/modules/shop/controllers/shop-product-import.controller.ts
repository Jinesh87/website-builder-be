import type { NextFunction, Request, Response } from "express";
import { shopProductImportService } from "../services/shop-product-import.service.js";

type WebsiteParams = { id: string };

/** Bulk product import from a CSV or Excel sheet. Mounted under /api/websites/:id/shop/products/import. */
export class ShopProductImportController {
  /** What the file would create and update, and any problems, without saving. */
  preview = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ import: await shopProductImportService.preview(req.params.id, req.file, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  /** Saves the file's products when it has no problems. */
  apply = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ import: await shopProductImportService.apply(req.params.id, req.file, req.user!) });
    } catch (error) {
      next(error);
    }
  };
}

export const shopProductImportController = new ShopProductImportController();
